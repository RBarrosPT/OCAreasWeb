import express from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { pool } from "../db/pool.js";
import { createToken, normalizeEmail, normalizeUsername, validatePassword, validateUsername } from "../utils.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = express.Router();

const failedLoginState = new Map();
let loginAlertTransporter = null;
let missingAlertConfigLogged = false;

function toPositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.trunc(parsed);
}

function isAlertEmailEnabled() {
  return String(process.env.ALERT_EMAIL_ENABLED || "false").toLowerCase() === "true";
}

function getAlertMailConfig() {
  const host = process.env.ALERT_SMTP_HOST || "";
  const port = toPositiveInt(process.env.ALERT_SMTP_PORT, 587);
  const secure = String(process.env.ALERT_SMTP_SECURE || "false").toLowerCase() === "true";
  const user = process.env.ALERT_SMTP_USER || "";
  const pass = process.env.ALERT_SMTP_PASS || "";
  const to = process.env.ALERT_EMAIL_TO || "";
  const from = process.env.ALERT_EMAIL_FROM || user;

  return { host, port, secure, user, pass, to, from };
}

async function sendFailedLoginAlertEmail({ username, ip, reason, count, windowMs }) {
  const config = getAlertMailConfig();
  const hasRequiredConfig = config.host && config.user && config.pass && config.to && config.from;

  if (!hasRequiredConfig) {
    if (!missingAlertConfigLogged) {
      console.warn("[auth][login][alert-email] Configuração SMTP incompleta. Alerta por email desativado.");
      missingAlertConfigLogged = true;
    }
    return;
  }

  if (!loginAlertTransporter) {
    loginAlertTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  const occurredAt = new Date().toISOString();
  await loginAlertTransporter.sendMail({
    from: config.from,
    to: config.to,
    subject: `[OCMapas] Alerta de falhas de login (${count})`,
    text: [
      "Foram detetadas várias falhas de autenticação no OCMapas.",
      "",
      `timestamp: ${occurredAt}`,
      `username: ${username || "(empty)"}`,
      `ip: ${ip}`,
      `reason: ${reason}`,
      `falhas_no_intervalo: ${count}`,
      `janela_ms: ${windowMs}`,
    ].join("\n"),
  });
}

function getRequestIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
}

function logAuthFailure(req, username, reason) {
  const safeUsername = username || "(empty)";
  const ip = getRequestIp(req);
  console.warn(`[auth][login][failed] username=${safeUsername} ip=${ip} reason=${reason}`);
}

function trackFailedLoginAndNotify(req, username, reason) {
  logAuthFailure(req, username, reason);

  if (!isAlertEmailEnabled()) {
    return;
  }

  const threshold = toPositiveInt(process.env.ALERT_LOGIN_THRESHOLD, 5);
  const windowMs = toPositiveInt(process.env.ALERT_LOGIN_WINDOW_MS, 10 * 60 * 1000);
  const cooldownMs = toPositiveInt(process.env.ALERT_LOGIN_COOLDOWN_MS, 30 * 60 * 1000);

  const ip = getRequestIp(req);
  const safeUsername = username || "(empty)";
  const key = `${safeUsername}|${ip}`;
  const now = Date.now();

  const previous = failedLoginState.get(key);
  const currentTimestamps = (previous?.timestamps || []).filter((timestamp) => now - timestamp <= windowMs);
  currentTimestamps.push(now);

  const lastAlertAt = previous?.lastAlertAt || 0;
  const count = currentTimestamps.length;
  const canAlertByThreshold = count >= threshold;
  const canAlertByCooldown = !lastAlertAt || now - lastAlertAt >= cooldownMs;

  if (canAlertByThreshold && canAlertByCooldown) {
    failedLoginState.set(key, {
      timestamps: currentTimestamps,
      lastAlertAt: now,
    });

    sendFailedLoginAlertEmail({
      username: safeUsername,
      ip,
      reason,
      count,
      windowMs,
    }).catch((error) => {
      console.error("[auth][login][alert-email][error]", error?.message || error);
    });
    return;
  }

  failedLoginState.set(key, {
    timestamps: currentTimestamps,
    lastAlertAt,
  });
}

authRouter.post("/register", async (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: "Indique um endereço de email válido." });
  }

  const usernameError = validateUsername(username);
  if (usernameError) {
    return res.status(400).json({ error: usernameError });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const allowedEmailResult = await client.query(
      "SELECT id, used_at FROM allowed_registration_emails WHERE email = $1 FOR UPDATE",
      [email],
    );

    const allowedEmail = allowedEmailResult.rows[0];
    if (!allowedEmail) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Este email não está autorizado a registar-se." });
    }

    if (allowedEmail.used_at) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Este email autorizado já foi utilizado no registo." });
    }

    const result = await client.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [username, passwordHash],
    );

    const user = result.rows[0];
    await client.query(
      "UPDATE allowed_registration_emails SET used_by_user_id = $1, used_at = NOW() WHERE id = $2",
      [user.id, allowedEmail.id],
    );
    await client.query("COMMIT");

    return res.status(201).json({
      token: createToken(user),
      user,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error?.code === "23505") {
      return res.status(409).json({ error: "Este utilizador já existe." });
    }
    return res.status(500).json({ error: "Erro ao criar conta." });
  } finally {
    client.release();
  }
});

authRouter.post("/login", async (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const password = String(req.body?.password || "");

  if (!username || !password) {
    trackFailedLoginAndNotify(req, username, "missing_credentials");
    return res.status(400).json({ error: "Introduza utilizador e password." });
  }

  const result = await pool.query("SELECT id, username, password_hash FROM users WHERE username = $1", [username]);
  const row = result.rows[0];

  if (!row) {
    trackFailedLoginAndNotify(req, username, "user_not_found");
    return res.status(401).json({ error: "Credenciais inválidas." });
  }

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    trackFailedLoginAndNotify(req, username, "invalid_password");
    return res.status(401).json({ error: "Credenciais inválidas." });
  }

  const user = { id: row.id, username: row.username };
  return res.json({ token: createToken(user), user });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const result = await pool.query("SELECT id, username FROM users WHERE id = $1", [req.user.id]);
  const user = result.rows[0];

  if (!user) {
    return res.status(404).json({ error: "Utilizador não encontrado." });
  }

  return res.json({ user });
});
