import { NextResponse } from "next/server";
import { getDb } from "@/lib/sqlite";

export const runtime = "nodejs";

type HistoryRow = {
  id: string;
  game_id: string;
  started_at: number | null;
  ended_at: number | null;
  winner: string | null;
  summary_json: string | null;
  state_json: string | null;
  created_at: number;
};

function mapRow(row: HistoryRow) {
  return {
    ...row,
    summary: row.summary_json ? JSON.parse(row.summary_json) : null,
    state: row.state_json ? JSON.parse(row.state_json) : null,
  };
}

export async function GET() {
  try {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM game_history ORDER BY created_at DESC")
      .all() as HistoryRow[];
    return NextResponse.json({ ok: true, data: rows.map(mapRow) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      game_id?: string;
      started_at?: number | null;
      ended_at?: number | null;
      winner?: string | null;
      summary?: unknown;
      state?: unknown;
    };
    const id = crypto.randomUUID ? crypto.randomUUID() : `history-${Date.now()}`;
    const gameId = body.game_id ?? id;
    const createdAt = Date.now();
    const db = getDb();
    db.prepare(
      `INSERT INTO game_history
        (id, game_id, started_at, ended_at, winner, summary_json, state_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      gameId,
      body.started_at ?? null,
      body.ended_at ?? null,
      body.winner ?? null,
      body.summary ? JSON.stringify(body.summary) : null,
      body.state ? JSON.stringify(body.state) : null,
      createdAt
    );
    return NextResponse.json({ ok: true, data: { id } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
