import { NextResponse } from "next/server";
import { getDb } from "@/lib/sqlite";

export const runtime = "nodejs";

type HistoryStatus = "in_progress" | "paused" | "completed";

type HistoryRow = {
  id: string;
  game_id: string;
  started_at: number | null;
  ended_at: number | null;
  winner: string | null;
  summary_json: string | null;
  state_json: string | null;
  status: string | null;
  updated_at: number | null;
  last_checkpoint_state_json: string | null;
  created_at: number;
};

type HistoryPayload = {
  action?: "start" | "checkpoint" | "pause" | "resume" | "complete";
  game_id?: string;
  started_at?: number | null;
  ended_at?: number | null;
  winner?: string | null;
  summary?: unknown;
  state?: unknown;
};

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function serializeJson(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function deriveStatus(row: HistoryRow): HistoryStatus {
  if (row.status === "in_progress" || row.status === "paused" || row.status === "completed") {
    return row.status;
  }
  if (row.ended_at) return "completed";
  return "paused";
}

function getUpdatedAt(row: HistoryRow) {
  return row.updated_at ?? row.ended_at ?? row.started_at ?? row.created_at;
}

function mapListRow(row: HistoryRow) {
  const checkpoint =
    parseJson<{ day?: number; phase?: string }>(row.last_checkpoint_state_json) ??
    parseJson<{ day?: number; phase?: string }>(row.state_json);
  return {
    id: row.id,
    game_id: row.game_id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    winner: row.winner,
    status: deriveStatus(row),
    updated_at: getUpdatedAt(row),
    created_at: row.created_at,
    day: typeof checkpoint?.day === "number" ? checkpoint.day : null,
    phase: typeof checkpoint?.phase === "string" ? checkpoint.phase : null,
  };
}

function mapDetailRow(row: HistoryRow) {
  return {
    id: row.id,
    game_id: row.game_id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    winner: row.winner,
    status: deriveStatus(row),
    updated_at: getUpdatedAt(row),
    created_at: row.created_at,
    summary: parseJson(row.summary_json),
    state: parseJson(row.state_json),
    checkpointState: parseJson(row.last_checkpoint_state_json),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitParam ?? 30) || 30, 1), 30);
    const db = getDb();

    if (id) {
      const row = db
        .prepare(
          "SELECT * FROM game_history WHERE game_id = ? OR id = ? ORDER BY created_at DESC LIMIT 1"
        )
        .get(id, id) as HistoryRow | undefined;
      return NextResponse.json({ ok: true, data: row ? mapDetailRow(row) : null });
    }

    const rows = db
      .prepare(
        "SELECT * FROM game_history ORDER BY COALESCE(updated_at, created_at) DESC LIMIT ?"
      )
      .all(limit) as HistoryRow[];
    return NextResponse.json({ ok: true, data: rows.map(mapListRow) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as HistoryPayload;
    const action = body.action;
    const gameId = body.game_id;
    if (!action || !gameId) {
      return NextResponse.json({ ok: false, error: "Missing action or game_id" }, { status: 400 });
    }

    const db = getDb();
    const now = Date.now();

    if (action === "start") {
      const startedAt = body.started_at ?? now;
      const checkpointJson = serializeJson(body.state);
      let rowId: string | null = null;

      const tx = db.transaction(() => {
        db.prepare("UPDATE game_history SET status = 'paused', updated_at = ? WHERE status = 'in_progress' AND game_id != ?")
          .run(now, gameId);
        const existing = db
          .prepare("SELECT id FROM game_history WHERE game_id = ? ORDER BY created_at DESC LIMIT 1")
          .get(gameId) as { id: string } | undefined;
        if (existing) {
          rowId = existing.id;
          db.prepare(
            "UPDATE game_history SET status = 'in_progress', started_at = ?, updated_at = ?, last_checkpoint_state_json = ? WHERE id = ?"
          ).run(startedAt, now, checkpointJson, existing.id);
        } else {
          rowId = crypto.randomUUID ? crypto.randomUUID() : `history-${Date.now()}`;
          db.prepare(
            `INSERT INTO game_history
              (id, game_id, started_at, ended_at, winner, summary_json, state_json, status, updated_at, last_checkpoint_state_json, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            rowId,
            gameId,
            startedAt,
            null,
            null,
            null,
            null,
            "in_progress",
            now,
            checkpointJson,
            now
          );
        }
      });

      tx();
      return NextResponse.json({ ok: true, data: { id: rowId } });
    }

    if (action === "checkpoint") {
      const checkpointJson = serializeJson(body.state);
      if (!checkpointJson) {
        return NextResponse.json({ ok: false, error: "Missing state" }, { status: 400 });
      }
      const tx = db.transaction(() => {
        db.prepare("UPDATE game_history SET status = 'paused', updated_at = ? WHERE status = 'in_progress' AND game_id != ?")
          .run(now, gameId);
        const existing = db
          .prepare("SELECT id FROM game_history WHERE game_id = ? ORDER BY created_at DESC LIMIT 1")
          .get(gameId) as { id: string } | undefined;
        if (existing) {
          db.prepare(
            "UPDATE game_history SET status = 'in_progress', updated_at = ?, last_checkpoint_state_json = ? WHERE id = ?"
          ).run(now, checkpointJson, existing.id);
        } else {
          const rowId = crypto.randomUUID ? crypto.randomUUID() : `history-${Date.now()}`;
          db.prepare(
            `INSERT INTO game_history
              (id, game_id, started_at, ended_at, winner, summary_json, state_json, status, updated_at, last_checkpoint_state_json, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            rowId,
            gameId,
            now,
            null,
            null,
            null,
            null,
            "in_progress",
            now,
            checkpointJson,
            now
          );
        }
      });
      tx();
      return NextResponse.json({ ok: true });
    }

    if (action === "pause") {
      db.prepare("UPDATE game_history SET status = 'paused', updated_at = ? WHERE game_id = ?")
        .run(now, gameId);
      return NextResponse.json({ ok: true });
    }

    if (action === "resume") {
      const tx = db.transaction(() => {
        db.prepare("UPDATE game_history SET status = 'paused', updated_at = ? WHERE status = 'in_progress' AND game_id != ?")
          .run(now, gameId);
        db.prepare("UPDATE game_history SET status = 'in_progress', updated_at = ? WHERE game_id = ?")
          .run(now, gameId);
      });
      tx();

      const row = db
        .prepare("SELECT * FROM game_history WHERE game_id = ? ORDER BY created_at DESC LIMIT 1")
        .get(gameId) as HistoryRow | undefined;
      return NextResponse.json({ ok: true, data: row ? mapDetailRow(row) : null });
    }

    if (action === "complete") {
      const summaryJson = serializeJson(body.summary);
      const stateJson = serializeJson(body.state);
      db.prepare(
        "UPDATE game_history SET status = 'completed', ended_at = ?, winner = ?, summary_json = ?, state_json = ?, updated_at = ? WHERE game_id = ?"
      ).run(
        body.ended_at ?? now,
        body.winner ?? null,
        summaryJson,
        stateJson,
        now,
        gameId
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
