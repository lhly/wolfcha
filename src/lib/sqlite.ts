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
      models_json TEXT,
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
      status TEXT,
      updated_at INTEGER,
      last_checkpoint_state_json TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS player_reviews (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      target_player_id TEXT NOT NULL,
      target_seat INTEGER NOT NULL,
      reviewer_player_id TEXT NOT NULL,
      reviewer_seat INTEGER NOT NULL,
      reviewer_name TEXT NOT NULL,
      reviewer_role TEXT NOT NULL,
      reviewer_avatar TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meta_kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  ensureLlmConfigColumns(database);
  ensureGameHistoryColumns(database);
}

type TableInfoRow = { name: string };

type LlmConfigColumn = {
  name: string;
  definition: string;
};

const llmConfigColumns: LlmConfigColumn[] = [
  { name: "models_json", definition: "TEXT" },
];

function ensureLlmConfigColumns(database: Database.Database) {
  const rows = database.prepare("PRAGMA table_info(llm_config)").all() as TableInfoRow[];
  const existing = new Set(rows.map((row) => row.name));
  for (const column of llmConfigColumns) {
    if (existing.has(column.name)) continue;
    database.exec(`ALTER TABLE llm_config ADD COLUMN ${column.name} ${column.definition}`);
  }
}

type GameHistoryColumn = {
  name: string;
  definition: string;
};

const gameHistoryColumns: GameHistoryColumn[] = [
  { name: "status", definition: "TEXT" },
  { name: "updated_at", definition: "INTEGER" },
  { name: "last_checkpoint_state_json", definition: "TEXT" },
];

function ensureGameHistoryColumns(database: Database.Database) {
  const rows = database.prepare("PRAGMA table_info(game_history)").all() as TableInfoRow[];
  const existing = new Set(rows.map((row) => row.name));
  for (const column of gameHistoryColumns) {
    if (existing.has(column.name)) continue;
    database.exec(`ALTER TABLE game_history ADD COLUMN ${column.name} ${column.definition}`);
  }
}
