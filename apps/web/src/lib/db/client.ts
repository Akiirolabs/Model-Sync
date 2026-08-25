import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

let singleton: DatabaseSync | null = null;

function resolveDbPath(): string {
  const configured = process.env.MODEL_SYNC_DB_PATH ?? "../../data/model-sync.db";
  const absolute = path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  return absolute;
}

function migrate(db: DatabaseSync): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      model_tag TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS metrics (
      run_id TEXT PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE,
      series_json TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'upload',
      ingested_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS diagnoses (
      run_id TEXT PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE,
      result_json TEXT NOT NULL,
      analyzed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS history_events (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fix_documents (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      finding_id TEXT NOT NULL,
      fix_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body_markdown TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      window_start INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_history_run ON history_events(run_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_fixes_run ON fix_documents(run_id);
  `);
}

/** Shared SQLite handle (Node built-in — no native addon). */
export function getDb(): DatabaseSync {
  if (singleton) return singleton;
  const db = new DatabaseSync(resolveDbPath());
  migrate(db);
  singleton = db;
  return db;
}
