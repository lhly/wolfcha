import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "data", "wolfcha.db");

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    ensureSchema(db);
  }
  return db;
}

function ensureSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS llm_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      base_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      model TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS game_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL,
      state_json TEXT NOT NULL,
      saved_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS custom_characters (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      gender TEXT NOT NULL,
      age INTEGER NOT NULL,
      mbti TEXT NOT NULL,
      basic_info TEXT,
      style_label TEXT,
      avatar_seed TEXT,
      is_deleted INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS game_history (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      started_at INTEGER,
      ended_at INTEGER,
      winner TEXT,
      summary_json TEXT,
      state_json TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meta_kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
