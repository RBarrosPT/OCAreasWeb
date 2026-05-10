import jwt from "jsonwebtoken";

export function normalizeUsername(username = "") {
  return String(username).trim().toLowerCase();
}

// Returns an error message string, or null when valid.
export function validateUsername(normalizedUsername) {
  if (normalizedUsername.length < 6) {
    return "O utilizador deve ter pelo menos 6 caracteres.";
  }
  if (!/^[a-z0-9._]+$/.test(normalizedUsername)) {
    return "O utilizador apenas pode conter letras (a-z), números (0-9), ponto (.) ou underscore (_).";
  }
  return null;
}

// Returns an error message string, or null when valid.
export function validatePassword(password) {
  if (password.length < 9) {
    return "A password deve ter pelo menos 9 caracteres.";
  }
  if (!/[A-Z]/.test(password)) {
    return "A password deve conter pelo menos uma letra maiúscula.";
  }
  if (!/[a-z]/.test(password)) {
    return "A password deve conter pelo menos uma letra minúscula.";
  }
  if (!/[0-9]/.test(password)) {
    return "A password deve conter pelo menos um número.";
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return "A password deve conter pelo menos um símbolo.";
  }
  return null;
}

export function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

export function normalizeJsonObject(value, fallback = {}) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return fallback;
    }
  }

  return fallback;
}

export function createToken(user) {
  return jwt.sign(
    {
      username: user.username,
    },
    process.env.JWT_SECRET || "change-me",
    {
      subject: String(user.id),
      expiresIn: "7d",
    },
  );
}

export function mapRowToDto(row, requesterId) {
  const isOwner = Number(row.owner_id) === Number(requesterId);
  const permission = isOwner ? "owner" : row.can_edit ? "edit" : "read";
  const sharedWithUsernames = Array.isArray(row.shared_usernames) ? row.shared_usernames : [];
  const itemColors = normalizeJsonObject(row.item_colors, {});
  const colorNames = normalizeJsonObject(row.color_names, {});

  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerUsername: row.owner_username,
    name: row.name,
    itemColors,
    colorNames,
    notes: row.notes || "",
    isPublic: Boolean(row.is_public),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sharedWithUsernames,
    permission,
    canEdit: permission === "owner" || permission === "edit",
    canShare: permission === "owner",
    canDelete: permission === "owner",
    canCopy: permission === "owner",
  };
}
