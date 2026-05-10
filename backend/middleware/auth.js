import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Não autenticado." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "change-me");
    const userId = Number(payload.sub);

    if (!Number.isFinite(userId)) {
      return res.status(401).json({ error: "Token inválido." });
    }

    req.user = {
      id: userId,
      username: payload.username,
    };
    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido." });
  }
}
