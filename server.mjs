import path from "node:path";
import fs from "node:fs";
import express from "express";
import session from "express-session";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const PORT = Number(process.env.PORT || 8000);
const SESSION_SECRET = process.env.SESSION_SECRET || "dev_secret_change_me";
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "app.db");

const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@disasteralert.bg";
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin123!";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

ensureDir(path.dirname(DB_PATH));
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  create table if not exists users (
    id integer primary key autoincrement,
    email text not null unique,
    password_hash text not null,
    name text not null,
    city text,
    regions text,
    role text not null default 'user',
    created_at text not null,
    updated_at text not null
  );
`);

const getUserByEmail = db.prepare(`select * from users where email = ?`);
const createUser = db.prepare(`
  insert into users (email, password_hash, name, city, regions, role, created_at, updated_at)
  values (@email, @password_hash, @name, @city, @regions, @role, @created_at, @updated_at)
`);
const updateUserProfile = db.prepare(`
  update users
  set name = @name,
      city = @city,
      regions = @regions,
      updated_at = @updated_at
  where id = @id
`);

function safeUser(u) {
  if (!u) return null;
  const { password_hash: _pw, ...rest } = u;
  return rest;
}

function seedAdmin() {
  const existing = getUserByEmail.get(SEED_ADMIN_EMAIL);
  if (existing) return;
  const now = new Date().toISOString();
  const password_hash = bcrypt.hashSync(SEED_ADMIN_PASSWORD, 10);
  createUser.run({
    email: SEED_ADMIN_EMAIL,
    password_hash,
    name: "Admin Operator",
    city: "Sofia",
    regions: "",
    role: "admin",
    created_at: now,
    updated_at: now,
  });
  // eslint-disable-next-line no-console
  console.log(`[seed] admin created: ${SEED_ADMIN_EMAIL} / ${SEED_ADMIN_PASSWORD}`);
}
seedAdmin();

const app = express();

app.use(express.json({ limit: "200kb" }));
app.use(
  session({
    name: "alertix.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false
    },
  })
);

function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: "unauthorized" });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: "unauthorized" });
  if (req.session.user.role !== "admin") return res.status(403).json({ error: "forbidden" });
  next();
}

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/api/me", (req, res) => {
  res.json({ user: req.session?.user || null });
});

app.post("/api/auth/register", (req, res) => {
  const { email, password, name, city } = req.body || {};
  const em = String(email || "").trim().toLowerCase();
  const pw = String(password || "");
  const nm = String(name || "").trim();
  const ct = String(city || "").trim();

  if (!em || !pw || pw.length < 6 || !nm) return res.status(400).json({ error: "invalid_input" });
  if (getUserByEmail.get(em)) return res.status(409).json({ error: "email_taken" });

  const now = new Date().toISOString();
  const password_hash = bcrypt.hashSync(pw, 10);
  const info = createUser.run({
    email: em,
    password_hash,
    name: nm,
    city: ct || null,
    regions: "",
    role: "user",
    created_at: now,
    updated_at: now,
  });

  const u = db.prepare("select * from users where id = ?").get(info.lastInsertRowid);
  req.session.user = safeUser(u);
  res.json({ user: req.session.user });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const em = String(email || "").trim().toLowerCase();
  const pw = String(password || "");
  const u = em ? getUserByEmail.get(em) : null;
  if (!u) return res.status(401).json({ error: "bad_credentials" });
  if (!bcrypt.compareSync(pw, u.password_hash)) return res.status(401).json({ error: "bad_credentials" });
  req.session.user = safeUser(u);
  res.json({ user: req.session.user });
});

app.post("/api/auth/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

app.post("/api/profile", requireAuth, (req, res) => {
  const { name, city, regions } = req.body || {};
  const nm = String(name || "").trim();
  if (!nm) return res.status(400).json({ error: "invalid_input" });
  const ct = String(city || "").trim();
  const rg = String(regions || "").trim();

  const now = new Date().toISOString();
  updateUserProfile.run({
    id: req.session.user.id,
    name: nm,
    city: ct || null,
    regions: rg,
    updated_at: now,
  });
  const u = db.prepare("select * from users where id = ?").get(req.session.user.id);
  req.session.user = safeUser(u);
  res.json({ user: req.session.user });
});

// Protect admin page on the server side (not just hiding links)
app.get("/disaster-alert-site/admin.html", (req, res, next) => {
  if (!req.session?.user) return res.status(302).set("Location", "/disaster-alert-site/index.html#auth").end();
  if (req.session.user.role !== "admin") return res.status(403).send("Forbidden");
  next();
});

// Example admin-only API
app.get("/api/admin/users", requireAdmin, (req, res) => {
  const rows = db.prepare("select id, email, name, city, regions, role, created_at, updated_at from users order by created_at desc").all();
  res.json({ users: rows });
});

const publicDir = path.join(process.cwd(), "disaster-alert-site");
app.use("/disaster-alert-site", express.static(publicDir, { extensions: ["html"] }));

app.get("/", (req, res) => res.redirect("/disaster-alert-site/"));

app.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${PORT}/disaster-alert-site/`);
});

