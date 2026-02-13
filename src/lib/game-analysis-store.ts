import type Database from "better-sqlite3";
import type { GameAnalysisReport } from "@/types/analysis";

export function upsertGameAnalysisReport(
  db: Database.Database,
  gameId: string,
  report: GameAnalysisReport | Record<string, unknown>
) {
  const now = Date.now();
  const normalized = { ...(report as Record<string, unknown>), gameId };
  const reportJson = JSON.stringify(normalized);
  db.prepare(
    `INSERT INTO game_analysis (game_id, report_json, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(game_id) DO UPDATE SET
       report_json = excluded.report_json,
       updated_at = excluded.updated_at`
  ).run(gameId, reportJson, now, now);
}

export function fetchGameAnalysisReport(
  db: Database.Database,
  gameId: string
): GameAnalysisReport | null {
  const row = db
    .prepare("SELECT report_json FROM game_analysis WHERE game_id = ?")
    .get(gameId) as { report_json?: string } | undefined;
  if (!row?.report_json) return null;
  try {
    return JSON.parse(row.report_json) as GameAnalysisReport;
  } catch {
    return null;
  }
}
