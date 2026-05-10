import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

export const pool = new Pool({
  host: process.env.POSTGRES_HOST || "db",
  port: Number(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB || "ocmapas",
  user: process.env.POSTGRES_USER || "ocmapas",
  password: process.env.POSTGRES_PASSWORD || "ocmapas",
});
