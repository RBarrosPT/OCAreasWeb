import express from "express";
import { pool } from "../db/pool.js";

export const usersRouter = express.Router();

usersRouter.get("/", async (req, res) => {
  const result = await pool.query(
    `SELECT id, username
       FROM users
      WHERE id <> $1
      ORDER BY username ASC`,
    [req.user.id],
  );

  return res.json({ users: result.rows });
});
