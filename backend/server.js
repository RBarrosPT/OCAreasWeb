import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { initDb } from "./db/init-db.js";
import { requireAuth } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { mapsRouter } from "./routes/maps.js";
import { usersRouter } from "./routes/users.js";

// Carrega variáveis de ambiente a partir do ficheiro .env.
dotenv.config();

// Resolve caminhos absolutos no contexto de módulos ES.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Raiz do projeto (onde estão os assets estáticos do frontend).
const rootDir = path.resolve(__dirname, "..");

function getAssetVersion(requestedVersion) {
  if (requestedVersion) {
    return String(requestedVersion);
  }

  if (process.env.BUILD_VERSION && process.env.BUILD_VERSION !== "dev") {
    return String(process.env.BUILD_VERSION);
  }

  return String(Date.now());
}

const app = express();

// Limita o tamanho de payload JSON para reduzir risco de abuse.
app.use(express.json({ limit: "1mb" }));

// Header global para instruir motores de busca a não indexar nem seguir links.
app.use((_req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  next();
});

// Paths sensíveis que não devem ser servidos pelo origin.
const blockedPathPatterns = [
  /^\/README\.md$/i,
  /^\/ADMINER_ACCESS\.md$/i,
  /^\/\.env(?:\..*)?$/i,
  /^\/backend(?:\/|$)/i,
  /^\/docker-compose\.ya?ml$/i,
  /^\/Dockerfile$/i,
  /^\/package(?:-lock)?\.json$/i,
];

// Bloqueia acesso direto a ficheiros/configuração sensível.
app.use((req, res, next) => {
  const requestPath = decodeURIComponent(req.path || "/");

  if (blockedPathPatterns.some((pattern) => pattern.test(requestPath))) {
    return res.status(404).end();
  }

  return next();
});

// Healthcheck simples para monitorização.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Rotas públicas de autenticação.
app.use("/api/auth", authRouter);
// Rotas protegidas por JWT.
app.use("/api/maps", requireAuth, mapsRouter);
app.use("/api/users", requireAuth, usersRouter);

app.get(/\.(?:js|css|html)$/, async (req, res, next) => {
  const requestedPath = path.resolve(rootDir, `.${req.path}`);

  if (requestedPath !== rootDir && !requestedPath.startsWith(`${rootDir}${path.sep}`)) {
    return next();
  }

  try {
    const fileContent = await fs.readFile(requestedPath, "utf8");
    const extension = path.extname(requestedPath).toLowerCase();

    if (extension === ".html") {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    } else {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }

    res
      .type(extension)
      .send(fileContent.replaceAll("__ASSET_VERSION__", getAssetVersion(req.query?.v)));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return next();
    }

    return next(error);
  }
});

// Serve ficheiros estáticos do frontend.
app.use(express.static(rootDir, {
  index: false,
  // Impede exposição de ficheiros ocultos (ex.: .env).
  dotfiles: "deny",
  setHeaders: (res, filePath) => {
    // index.html sem cache para refletir novas versões imediatamente.
    if (filePath.endsWith("index.html")) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      return;
    }

    // Restantes assets com cache longa e imutável.
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  },
}));

// SPA fallback: qualquer rota não-API devolve o index.html.
app.get("*", async (_req, res, next) => {
  try {
    const indexPath = path.join(rootDir, "index.html");
    const html = await fs.readFile(indexPath, "utf8");
    res
      .type("html")
      .set("Cache-Control", "no-cache, no-store, must-revalidate")
      .send(html.replaceAll("__ASSET_VERSION__", getAssetVersion()));
  } catch (error) {
    next(error);
  }
});


// Inicializa base de dados e arranca servidor HTTP.
async function start() {
  try {
    await initDb();
    const port = Number(process.env.PORT || 3000);
    app.listen(port, "0.0.0.0", () => {
      console.log(`Servidor iniciado na porta ${port}`);
    });
  } catch (error) {
    console.error("Erro ao iniciar servidor:", error);
    process.exit(1);
  }
}


start();
