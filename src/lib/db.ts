import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

const DATA_DIR = path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const OUTBOX_DIR = path.join(DATA_DIR, "outbox");
export const INBOX_DIR = path.join(DATA_DIR, "inbox");
const DB_PATH = path.join(DATA_DIR, "renewal.db");

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  provider TEXT,
  renewal_date TEXT NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'yearly',
  cadence_months INTEGER,
  auto_renew INTEGER NOT NULL DEFAULT 0,
  amount REAL,
  currency TEXT NOT NULL DEFAULT 'ILS',
  notice_days INTEGER NOT NULL DEFAULT 30,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  renewal_date TEXT NOT NULL,
  milestone INTEGER NOT NULL,
  channel TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  UNIQUE(item_id, renewal_date, milestone, channel)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  gmail_id TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'scan',
  from_email TEXT,
  from_name TEXT,
  subject TEXT,
  snippet TEXT,
  received_at TEXT,
  name TEXT,
  category TEXT,
  provider TEXT,
  renewal_date TEXT,
  amount REAL,
  currency TEXT NOT NULL DEFAULT 'ILS',
  verdict TEXT NOT NULL DEFAULT 'add',
  matched_item_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  files_json TEXT,
  created_at TEXT NOT NULL
);

-- One-tap buttons in emails. Each row is one button: a long random id in the URL,
-- single use, expires. The page at /a/<id> asks for confirmation before acting.
CREATE TABLE IF NOT EXISTS action_links (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  payload TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

-- What the tool did and when: email received, reminder sent, button pressed.
CREATE TABLE IF NOT EXISTS activity (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  kind TEXT NOT NULL,
  item_id TEXT,
  proposal_id TEXT,
  detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_items_renewal ON items(renewal_date);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_activity_at ON activity(at);
`;

// Columns added after the first release. Each is applied once, if missing.
const ITEM_COLUMNS: Array<[name: string, ddl: string]> = [
  ["subcategory", "TEXT"], // insurance type: car, home, health, life, ltc, pension, travel, other
  ["policy_number", "TEXT"],
  ["insured", "TEXT"], // who is covered / whose subscription
  ["start_date", "TEXT"],
  ["attention", "INTEGER NOT NULL DEFAULT 0"], // "needs a decision" flag, shown red everywhere
  ["snoozed_until", "TEXT"], // "remind me in a week": no reminders before this date
  ["ack_renewal_date", "TEXT"], // the renewal cycle the user already answered; no more reminders for it
];

function migrate(db: DatabaseSync) {
  const existing = new Set(
    (db.prepare("PRAGMA table_info(items)").all() as Array<{ name: string }>).map((row) => row.name),
  );
  for (const [name, ddl] of ITEM_COLUMNS) {
    if (!existing.has(name)) db.exec(`ALTER TABLE items ADD COLUMN ${name} ${ddl}`);
  }
}

type GlobalDb = typeof globalThis & { __renewalDb?: DatabaseSync };

function createDb(): DatabaseSync {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(OUTBOX_DIR, { recursive: true });
  fs.mkdirSync(INBOX_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  ensureSchema(db);
  return db;
}

function ensureSchema(db: DatabaseSync) {
  db.exec(SCHEMA);
  migrate(db);
}

export function getDb(): DatabaseSync {
  const g = globalThis as GlobalDb;
  if (!g.__renewalDb) {
    g.__renewalDb = createDb();
  } else {
    ensureSchema(g.__renewalDb);
  }
  return g.__renewalDb;
}

// node:sqlite returns rows with a null prototype; React can't pass those to client
// components, so every row is copied into a plain object.
function plain<T>(row: unknown): T {
  return { ...(row as Record<string, unknown>) } as T;
}

export function queryAll<T>(sql: string, params: SQLInputValue[] = []): T[] {
  return getDb().prepare(sql).all(...params).map((row) => plain<T>(row));
}

export function queryOne<T>(sql: string, params: SQLInputValue[] = []): T | undefined {
  const row = getDb().prepare(sql).get(...params);
  return row === undefined ? undefined : plain<T>(row);
}

export function run(sql: string, params: SQLInputValue[] = []) {
  return getDb().prepare(sql).run(...params);
}

export function getSetting(key: string): string | undefined {
  return queryOne<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key])?.value;
}

export function setSetting(key: string, value: string) {
  run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

