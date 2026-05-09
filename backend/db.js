import mysql from "mysql2/promise";

/**
 * Create a MySQL pool using environment variables.
 * @param {NodeJS.ProcessEnv} env
 */
export function createPool(env = process.env) {
  const host = env.DB_HOST || "localhost";
  const port = Number(env.DB_PORT || 3306);
  const user = env.DB_USER || "root";
  const password = env.DB_PASSWORD || "";
  const database = env.DB_NAME || "alertix";

  return mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
  });
}

export function toInt(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

