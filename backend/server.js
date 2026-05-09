import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPool, toInt } from "./db.js";

const app = express();
const pool = createPool();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = toInt(process.env.PORT, 5175);
// За локална разработка: отразява Origin от браузъра (работи и с localhost, и с 127.0.0.1).
// Ако зададеш FRONTEND_ORIGIN=http://a,http://b — ползва се бял списък.
const frontendOrigin = (process.env.FRONTEND_ORIGIN || "").trim();
const allowList = frontendOrigin
  ? frontendOrigin.split(",").map((s) => s.trim()).filter(Boolean)
  : null;
app.use(
  cors({
    origin: allowList && allowList.length ? allowList : true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: rows?.[0]?.ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// Serve schema for easy local setup (read-only)
app.get("/schema.sql", (_req, res) => {
  res.sendFile(path.join(__dirname, "schema.sql"));
});

function assertEnum(value, allowed, field) {
  if (!allowed.includes(value)) {
    const msg = `${field} must be one of: ${allowed.join(", ")}`;
    const err = new Error(msg);
    err.statusCode = 400;
    throw err;
  }
}

function numOrNull(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function intOrNull(v) {
  const n = numOrNull(v);
  if (n === null) return null;
  return Math.trunc(n);
}

function safeId(prefix, n) {
  const num = String(n).padStart(4, "0");
  return `${prefix}-${num}`;
}

async function nextNumeric(prefix) {
  // prefix is "al" or "evt" or "r"
  const table =
    prefix === "al" ? "alerts" :
    prefix === "evt" ? "disasters" :
    "regions";
  const [rows] = await pool.query(
    `SELECT id FROM ${table} WHERE id LIKE ? ORDER BY created_at DESC LIMIT 1`,
    [`${prefix}-%`],
  );
  const last = rows?.[0]?.id;
  const m = typeof last === "string" ? last.match(/-(\d+)$/) : null;
  const next = (m ? Number(m[1]) : 0) + 1;
  return safeId(prefix, next);
}

// ---- Alerts ----
app.get("/api/alerts", async (req, res) => {
  const region = (req.query.region || "all").toString();
  const type = (req.query.type || "all").toString();
  const limit = Math.min(200, Math.max(1, toInt(req.query.limit, 200)));

  const where = [];
  const params = [];
  if (region !== "all") {
    where.push("(region = 'all' OR region = ?)");
    params.push(region);
  }
  if (type !== "all") {
    where.push("type = ?");
    params.push(type);
  }

  const sql = `
    SELECT id, time, region, type, level, title, body, status
    FROM alerts
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY time DESC
    LIMIT ?
  `;
  params.push(limit);

  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

app.post("/api/alerts", async (req, res) => {
  const allowedRegion = ["all", "Sofia", "Varna", "Plovdiv", "Burgas"];
  const allowedType = ["earthquake", "flood", "fire", "storm", "other"];
  const allowedLevel = ["low", "medium", "high", "critical"];
  const allowedStatus = ["sent", "scheduled"];

  const region = String(req.body?.region || "all");
  const type = String(req.body?.type || "other");
  const level = String(req.body?.level || "low");
  const status = String(req.body?.status || "sent");
  const title = String(req.body?.title || "").trim();
  const body = String(req.body?.body || "").trim();

  assertEnum(region, allowedRegion, "region");
  assertEnum(type, allowedType, "type");
  assertEnum(level, allowedLevel, "level");
  assertEnum(status, allowedStatus, "status");
  if (!title || !body) return res.status(400).json({ error: "title and body are required" });

  const id = await nextNumeric("al");
  const time = new Date();
  await pool.query(
    `INSERT INTO alerts (id, time, region, type, level, title, body, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, time, region, type, level, title, body, status],
  );
  res.status(201).json({ id });
});

app.delete("/api/alerts/:id", async (req, res) => {
  const id = String(req.params.id || "");
  const [r] = await pool.query(`DELETE FROM alerts WHERE id = ?`, [id]);
  res.json({ ok: true, affectedRows: r?.affectedRows || 0 });
});

// ---- Disasters ----
app.get("/api/disasters", async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, type, time, place, region, damage, duration, level, status, notes,
            richter, focal_depth_km, wind_gust_kmh, rainfall_mm, water_level_cm, burned_area_ha
     FROM disasters
     ORDER BY time DESC
     LIMIT 500`,
  );
  res.json(rows);
});

app.post("/api/disasters", async (req, res) => {
  const allowedType = ["earthquake", "flood", "fire", "storm", "other"];
  const allowedRegion = ["Sofia", "Varna", "Plovdiv", "Burgas"];
  const allowedLevel = ["low", "medium", "high", "critical"];
  const allowedStatus = ["active", "contained", "resolved"];

  const type = String(req.body?.type || "other");
  const region = String(req.body?.region || "Sofia");
  const level = String(req.body?.level || "low");
  const status = String(req.body?.status || "active");
  const place = String(req.body?.place || "").trim();
  const notes = String(req.body?.notes || "").trim();
  const damage = req.body?.damage != null ? String(req.body.damage) : null;
  const duration = req.body?.duration != null ? String(req.body.duration) : null;
  const richter = numOrNull(req.body?.richter);
  const focal_depth_km = numOrNull(req.body?.focal_depth_km);
  const wind_gust_kmh = intOrNull(req.body?.wind_gust_kmh);
  const rainfall_mm = intOrNull(req.body?.rainfall_mm);
  const water_level_cm = intOrNull(req.body?.water_level_cm);
  const burned_area_ha = numOrNull(req.body?.burned_area_ha);

  const timeRaw = req.body?.time;
  const time = timeRaw ? new Date(timeRaw) : new Date();
  if (Number.isNaN(time.getTime())) return res.status(400).json({ error: "invalid time" });

  assertEnum(type, allowedType, "type");
  assertEnum(region, allowedRegion, "region");
  assertEnum(level, allowedLevel, "level");
  assertEnum(status, allowedStatus, "status");
  if (!place) return res.status(400).json({ error: "place is required" });

  const id = await nextNumeric("evt");
  await pool.query(
    `INSERT INTO disasters (id, type, time, place, region, damage, duration, level, status, notes,
       richter, focal_depth_km, wind_gust_kmh, rainfall_mm, water_level_cm, burned_area_ha)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, type, time, place, region, damage, duration, level, status, notes || null,
      richter, focal_depth_km, wind_gust_kmh, rainfall_mm, water_level_cm, burned_area_ha,
    ],
  );
  res.status(201).json({ id });
});

app.put("/api/disasters/:id", async (req, res) => {
  const id = String(req.params.id || "");
  const allowedType = ["earthquake", "flood", "fire", "storm", "other"];
  const allowedRegion = ["Sofia", "Varna", "Plovdiv", "Burgas"];
  const allowedLevel = ["low", "medium", "high", "critical"];
  const allowedStatus = ["active", "contained", "resolved"];

  const type = String(req.body?.type || "other");
  const region = String(req.body?.region || "Sofia");
  const level = String(req.body?.level || "low");
  const status = String(req.body?.status || "active");
  const place = String(req.body?.place || "").trim();
  const notes = String(req.body?.notes || "").trim();
  const damage = req.body?.damage != null ? String(req.body.damage) : null;
  const duration = req.body?.duration != null ? String(req.body.duration) : null;
  const richter = numOrNull(req.body?.richter);
  const focal_depth_km = numOrNull(req.body?.focal_depth_km);
  const wind_gust_kmh = intOrNull(req.body?.wind_gust_kmh);
  const rainfall_mm = intOrNull(req.body?.rainfall_mm);
  const water_level_cm = intOrNull(req.body?.water_level_cm);
  const burned_area_ha = numOrNull(req.body?.burned_area_ha);

  const timeRaw = req.body?.time;
  const time = timeRaw ? new Date(timeRaw) : new Date();
  if (Number.isNaN(time.getTime())) return res.status(400).json({ error: "invalid time" });

  assertEnum(type, allowedType, "type");
  assertEnum(region, allowedRegion, "region");
  assertEnum(level, allowedLevel, "level");
  assertEnum(status, allowedStatus, "status");
  if (!place) return res.status(400).json({ error: "place is required" });

  const [r] = await pool.query(
    `UPDATE disasters
     SET type=?, time=?, place=?, region=?, damage=?, duration=?, level=?, status=?, notes=?,
         richter=?, focal_depth_km=?, wind_gust_kmh=?, rainfall_mm=?, water_level_cm=?, burned_area_ha=?
     WHERE id=?`,
    [
      type, time, place, region, damage, duration, level, status, notes || null,
      richter, focal_depth_km, wind_gust_kmh, rainfall_mm, water_level_cm, burned_area_ha,
      id,
    ],
  );
  res.json({ ok: true, affectedRows: r?.affectedRows || 0 });
});

app.delete("/api/disasters/:id", async (req, res) => {
  const id = String(req.params.id || "");
  const [r] = await pool.query(`DELETE FROM disasters WHERE id = ?`, [id]);
  res.json({ ok: true, affectedRows: r?.affectedRows || 0 });
});

// ---- Regions ----
app.get("/api/regions", async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, city, category, name, note
     FROM regions
     ORDER BY created_at DESC
     LIMIT 500`,
  );
  res.json(rows);
});

app.post("/api/regions", async (req, res) => {
  const allowedCity = ["Sofia", "Varna", "Plovdiv", "Burgas"];
  const allowedCategory = ["affected", "safe", "shelter", "risk"];
  const city = String(req.body?.city || "Sofia");
  const category = String(req.body?.category || "risk");
  const name = String(req.body?.name || "").trim();
  const note = req.body?.note != null ? String(req.body.note) : null;

  assertEnum(city, allowedCity, "city");
  assertEnum(category, allowedCategory, "category");
  if (!name) return res.status(400).json({ error: "name is required" });

  const id = await nextNumeric("r");
  await pool.query(
    `INSERT INTO regions (id, city, category, name, note) VALUES (?, ?, ?, ?, ?)`,
    [id, city, category, name, note],
  );
  res.status(201).json({ id });
});

app.put("/api/regions/:id", async (req, res) => {
  const id = String(req.params.id || "");
  const allowedCity = ["Sofia", "Varna", "Plovdiv", "Burgas"];
  const allowedCategory = ["affected", "safe", "shelter", "risk"];
  const city = String(req.body?.city || "Sofia");
  const category = String(req.body?.category || "risk");
  const name = String(req.body?.name || "").trim();
  const note = req.body?.note != null ? String(req.body.note) : null;

  assertEnum(city, allowedCity, "city");
  assertEnum(category, allowedCategory, "category");
  if (!name) return res.status(400).json({ error: "name is required" });

  const [r] = await pool.query(
    `UPDATE regions SET city=?, category=?, name=?, note=? WHERE id=?`,
    [city, category, name, note, id],
  );
  res.json({ ok: true, affectedRows: r?.affectedRows || 0 });
});

app.delete("/api/regions/:id", async (req, res) => {
  const id = String(req.params.id || "");
  const [r] = await pool.query(`DELETE FROM regions WHERE id = ?`, [id]);
  res.json({ ok: true, affectedRows: r?.affectedRows || 0 });
});

// ---- Users (minimal) ----
app.get("/api/users", async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, name, email, region, role, status, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT 500`,
  );
  // UI expects activity text; provide a lightweight value
  res.json(rows.map((u) => ({ ...u, activity: "—" })));
});

// ---- Reports (admin equivalents) ----
app.get("/api/reports/active", async (_req, res) => {
  const [disasters] = await pool.query(
    `SELECT id, type, time, place, region, level, status
     FROM disasters
     WHERE status = 'active'
     ORDER BY time DESC
     LIMIT 500`,
  );
  const [alerts] = await pool.query(
    `SELECT id, time, region, type, level, title, status
     FROM alerts
     WHERE status = 'sent' AND level IN ('high','critical')
     ORDER BY time DESC
     LIMIT 500`,
  );
  res.json({ disasters, alerts });
});

app.get("/api/reports/by-month", async (req, res) => {
  const year = toInt(req.query.year, new Date().getFullYear());
  const month = toInt(req.query.month, new Date().getMonth() + 1); // 1-12
  if (month < 1 || month > 12) return res.status(400).json({ error: "month must be 1-12" });

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));

  const [alertsByRegion] = await pool.query(
    `SELECT region, COUNT(*) AS count
     FROM alerts
     WHERE time >= ? AND time < ?
     GROUP BY region
     ORDER BY count DESC`,
    [start, end],
  );

  const [disastersByType] = await pool.query(
    `SELECT type, COUNT(*) AS count
     FROM disasters
     WHERE time >= ? AND time < ?
     GROUP BY type
     ORDER BY count DESC`,
    [start, end],
  );

  res.json({ year, month, alertsByRegion, disastersByType });
});

// Error handler
app.use((err, _req, res, _next) => {
  const code = err?.statusCode || 500;
  res.status(code).json({ error: String(err?.message || err) });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`alertiX API running on http://localhost:${port}`);
});

