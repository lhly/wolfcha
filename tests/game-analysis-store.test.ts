import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { fetchGameAnalysisReport, upsertGameAnalysisReport } from "@/lib/game-analysis-store";

test("upsertGameAnalysisReport stores and fetches report", () => {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE game_analysis (
      game_id TEXT PRIMARY KEY,
      report_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  const report = { gameId: "game-1", result: "wolf_win" };
  upsertGameAnalysisReport(db, "game-1", report);

  const fetched = fetchGameAnalysisReport(db, "game-1");
  assert.ok(fetched);
  assert.equal(fetched?.gameId, "game-1");
  assert.equal((fetched as any).result, "wolf_win");
});
