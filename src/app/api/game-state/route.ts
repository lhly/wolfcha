import { NextResponse } from "next/server";
import { getDb } from "@/lib/sqlite";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getDb();
    const row = db.prepare("SELECT * FROM game_state WHERE id = 1").get() as
      | { version: number; state_json: string; saved_at: number }
      | undefined;
    if (!row) return NextResponse.json({ ok: true, data: null });
    const state = JSON.parse(row.state_json) as unknown;
    return NextResponse.json({
      ok: true,
      data: { version: row.version, state, saved_at: row.saved_at },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as { version?: number; state?: unknown };
    if (body.version === undefined || body.state === undefined) {
      return NextResponse.json({ ok: false, error: "Missing game state" }, { status: 400 });
    }
    const db = getDb();
    db.prepare(
      "INSERT INTO game_state (id, version, state_json, saved_at) VALUES (1, ?, ?, ?) " +
        "ON CONFLICT(id) DO UPDATE SET version=excluded.version, state_json=excluded.state_json, " +
        "saved_at=excluded.saved_at"
    ).run(body.version, JSON.stringify(body.state), Date.now());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const db = getDb();
    db.prepare("DELETE FROM game_state WHERE id = 1").run();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
