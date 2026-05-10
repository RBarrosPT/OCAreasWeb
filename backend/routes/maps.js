import express from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/pool.js";
import { mapRowToDto, normalizeJsonObject, normalizeUsername } from "../utils.js";

export const mapsRouter = express.Router();

const BASE_SELECT = `
  SELECT
    m.*,
    owner.username AS owner_username,
    ms.can_edit,
    COALESCE(
      (
        SELECT json_agg(u2.username ORDER BY u2.username)
        FROM map_shares ms2
        JOIN users u2 ON u2.id = ms2.shared_with_user_id
        WHERE ms2.map_id = m.id
      ),
      '[]'::json
    ) AS shared_usernames
  FROM maps m
  JOIN users owner ON owner.id = m.owner_id
  LEFT JOIN map_shares ms
    ON ms.map_id = m.id
   AND ms.shared_with_user_id = $1
`;

async function getAccessibleMap(mapId, userId) {
  const query = `
    ${BASE_SELECT}
    WHERE m.id = $2
      AND (
        m.owner_id = $1
        OR m.is_public = TRUE
        OR ms.shared_with_user_id IS NOT NULL
      )
    LIMIT 1
  `;
  const result = await pool.query(query, [userId, mapId]);
  return result.rows[0] || null;
}

mapsRouter.get("/", async (req, res) => {
  const query = `
    ${BASE_SELECT}
    WHERE
      m.owner_id = $1
      OR m.is_public = TRUE
      OR ms.shared_with_user_id IS NOT NULL
    ORDER BY m.updated_at DESC
  `;
  const result = await pool.query(query, [req.user.id]);
  const maps = result.rows.map((row) => mapRowToDto(row, req.user.id));
  return res.json({ maps });
});

mapsRouter.post("/", async (req, res) => {
  const name = String(req.body?.name || "").trim() || "Novo Mapa";
  const itemColors = normalizeJsonObject(req.body?.itemColors, {});
  const colorNames = normalizeJsonObject(req.body?.colorNames, {});
  const notes = typeof req.body?.notes === "string" ? req.body.notes : "";

  const mapId = uuidv4();

  await pool.query(
    `INSERT INTO maps (id, owner_id, name, item_colors, color_names, notes)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)`,
    [mapId, req.user.id, name, JSON.stringify(itemColors), JSON.stringify(colorNames), notes],
  );

  const created = await getAccessibleMap(mapId, req.user.id);
  return res.status(201).json({ map: mapRowToDto(created, req.user.id) });
});

mapsRouter.get("/backup", async (req, res) => {
  const result = await pool.query(
    `SELECT
       m.id,
       m.name,
       m.item_colors,
       m.color_names,
       m.notes,
       m.is_public,
       m.created_at,
       m.updated_at,
       COALESCE(
         (
           SELECT json_agg(
             json_build_object(
               'username', u.username,
               'canEdit', ms.can_edit
             )
             ORDER BY u.username
           )
           FROM map_shares ms
           JOIN users u ON u.id = ms.shared_with_user_id
           WHERE ms.map_id = m.id
         ),
         '[]'::json
       ) AS shares
     FROM maps m
     WHERE m.owner_id = $1
     ORDER BY m.updated_at DESC`,
    [req.user.id],
  );

  const maps = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    itemColors: normalizeJsonObject(row.item_colors, {}),
    colorNames: normalizeJsonObject(row.color_names, {}),
    notes: typeof row.notes === "string" ? row.notes : "",
    isPublic: Boolean(row.is_public),
    shares: Array.isArray(row.shares) ? row.shares : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return res.json({
    app: "OCMapas",
    version: 1,
    exportedAt: new Date().toISOString(),
    maps,
  });
});

mapsRouter.get("/:id", async (req, res) => {
  const row = await getAccessibleMap(req.params.id, req.user.id);
  if (!row) {
    return res.status(404).json({ error: "Mapa não encontrado." });
  }
  return res.json({ map: mapRowToDto(row, req.user.id) });
});

mapsRouter.put("/:id", async (req, res) => {
  const row = await getAccessibleMap(req.params.id, req.user.id);
  if (!row) {
    return res.status(404).json({ error: "Mapa não encontrado." });
  }

  const permission = row.owner_id === req.user.id ? "owner" : row.can_edit ? "edit" : "read";
  if (permission === "read") {
    return res.status(403).json({ error: "Sem permissão para editar este mapa." });
  }

  const name = String(req.body?.name || row.name).trim() || row.name;
  const itemColors = normalizeJsonObject(req.body?.itemColors, normalizeJsonObject(row.item_colors, {}));
  const colorNames = normalizeJsonObject(req.body?.colorNames, normalizeJsonObject(row.color_names, {}));
  const notes = typeof req.body?.notes === "string" ? req.body.notes : row.notes;

  await pool.query(
    `UPDATE maps
       SET name = $1,
           item_colors = $2::jsonb,
           color_names = $3::jsonb,
           notes = $4,
           updated_at = NOW()
     WHERE id = $5`,
    [name, JSON.stringify(itemColors), JSON.stringify(colorNames), notes, req.params.id],
  );

  const updated = await getAccessibleMap(req.params.id, req.user.id);
  return res.json({ map: mapRowToDto(updated, req.user.id) });
});

mapsRouter.delete("/:id", async (req, res) => {
  const result = await pool.query("DELETE FROM maps WHERE id = $1 AND owner_id = $2", [req.params.id, req.user.id]);

  if (result.rowCount === 0) {
    return res.status(403).json({ error: "Só o proprietário pode apagar o mapa." });
  }

  return res.status(204).send();
});

mapsRouter.post("/:id/copy", async (req, res) => {
  const row = await getAccessibleMap(req.params.id, req.user.id);
  if (!row || row.owner_id !== req.user.id) {
    return res.status(403).json({ error: "Só pode copiar mapas seus." });
  }

  const copyId = uuidv4();
  const baseName = `${row.name} (cópia)`;

  await pool.query(
    `INSERT INTO maps (id, owner_id, name, item_colors, color_names, notes)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)`,
    [copyId, req.user.id, baseName, JSON.stringify(row.item_colors), JSON.stringify(row.color_names), row.notes],
  );

  const copied = await getAccessibleMap(copyId, req.user.id);
  return res.status(201).json({ map: mapRowToDto(copied, req.user.id) });
});

mapsRouter.patch("/:id/visibility", async (req, res) => {
  const isPublic = Boolean(req.body?.isPublic);

  const result = await pool.query(
    `UPDATE maps
        SET is_public = $1,
            updated_at = NOW()
      WHERE id = $2
        AND owner_id = $3
      RETURNING id`,
    [isPublic, req.params.id, req.user.id],
  );

  if (!result.rowCount) {
    return res.status(403).json({ error: "Só o proprietário pode alterar visibilidade." });
  }

  const row = await getAccessibleMap(req.params.id, req.user.id);
  return res.json({ map: mapRowToDto(row, req.user.id) });
});

mapsRouter.get("/:id/shares", async (req, res) => {
  const ownerResult = await pool.query("SELECT owner_id FROM maps WHERE id = $1", [req.params.id]);
  const map = ownerResult.rows[0];

  if (!map || map.owner_id !== req.user.id) {
    return res.status(403).json({ error: "Só o proprietário pode gerir partilhas." });
  }

  const result = await pool.query(
    `SELECT ms.id, ms.can_edit, u.id AS user_id, u.username
       FROM map_shares ms
       JOIN users u ON u.id = ms.shared_with_user_id
      WHERE ms.map_id = $1
      ORDER BY u.username ASC`,
    [req.params.id],
  );

  return res.json({ shares: result.rows.map((row) => ({ id: row.id, canEdit: row.can_edit, userId: row.user_id, username: row.username })) });
});

mapsRouter.post("/:id/shares", async (req, res) => {
  const ownerResult = await pool.query("SELECT owner_id FROM maps WHERE id = $1", [req.params.id]);
  const map = ownerResult.rows[0];

  if (!map || map.owner_id !== req.user.id) {
    return res.status(403).json({ error: "Só o proprietário pode partilhar." });
  }

  const requestedUserId = Number(req.body?.userId);
  const username = normalizeUsername(req.body?.username);
  const canEdit = Boolean(req.body?.canEdit);

  if (!Number.isFinite(requestedUserId) && !username) {
    return res.status(400).json({ error: "Indique um utilizador para partilhar." });
  }

  const userResult = Number.isFinite(requestedUserId)
    ? await pool.query("SELECT id, username FROM users WHERE id = $1", [requestedUserId])
    : await pool.query("SELECT id, username FROM users WHERE username = $1", [username]);
  const targetUser = userResult.rows[0];

  if (!targetUser) {
    return res.status(404).json({ error: "Utilizador de destino não encontrado." });
  }

  if (targetUser.id === req.user.id) {
    return res.status(400).json({ error: "O proprietário já tem acesso total." });
  }

  await pool.query(
    `INSERT INTO map_shares (map_id, shared_with_user_id, can_edit)
     VALUES ($1, $2, $3)
     ON CONFLICT (map_id, shared_with_user_id)
     DO UPDATE SET can_edit = EXCLUDED.can_edit`,
    [req.params.id, targetUser.id, canEdit],
  );

  return res.status(201).json({ ok: true });
});

mapsRouter.delete("/:id/shares/:shareId", async (req, res) => {
  const ownerResult = await pool.query("SELECT owner_id FROM maps WHERE id = $1", [req.params.id]);
  const map = ownerResult.rows[0];

  if (!map || map.owner_id !== req.user.id) {
    return res.status(403).json({ error: "Só o proprietário pode remover partilhas." });
  }

  await pool.query("DELETE FROM map_shares WHERE id = $1 AND map_id = $2", [req.params.shareId, req.params.id]);
  return res.status(204).send();
});
