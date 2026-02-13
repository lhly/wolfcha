import { NextResponse } from "next/server";
import { getDb } from "@/lib/sqlite";
import type { GameState } from "@/types/game";
import {
  fetchReviewCards,
  generateReviewCards,
  insertReviewCards,
  loadLlmConfigFromDb,
} from "@/lib/player-reviews";
import { fetchGameAnalysisReport } from "@/lib/game-analysis-store";

export const runtime = "nodejs";

function parseTargetSeat(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  const seat = Math.floor(value);
  if (seat <= 0) return null;
  return seat;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("game_id")?.trim();
    const targetSeat = parseTargetSeat(searchParams.get("target_seat"));
    if (!gameId || !targetSeat) {
      return NextResponse.json({ ok: false, error: "Missing game_id or target_seat" }, { status: 400 });
    }
    const db = getDb();
    const cards = fetchReviewCards(db, gameId, targetSeat);
    return NextResponse.json({ ok: true, data: cards });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { game_id?: string; target_seat?: number; force?: boolean };
    const gameId = body.game_id?.trim();
    const targetSeat = Number.isFinite(body.target_seat) ? Math.floor(body.target_seat as number) : null;
    const force = body.force === true;
    if (!gameId || !targetSeat || targetSeat <= 0) {
      return NextResponse.json({ ok: false, error: "Missing game_id or target_seat" }, { status: 400 });
    }

    const db = getDb();
    loadLlmConfigFromDb(db);

    if (!force) {
      const existing = fetchReviewCards(db, gameId, targetSeat);
      if (existing.length > 0) {
        return NextResponse.json({ ok: true, data: existing });
      }
    }

    const row = db
      .prepare("SELECT state_json FROM game_history WHERE game_id = ? ORDER BY created_at DESC LIMIT 1")
      .get(gameId) as { state_json?: string | null } | undefined;
    const stateJson = row?.state_json ?? null;
    if (!stateJson) {
      return NextResponse.json({ ok: false, error: "Missing game state" }, { status: 404 });
    }
    let state: GameState;
    try {
      state = JSON.parse(stateJson) as GameState;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid game state" }, { status: 400 });
    }

    const report = fetchGameAnalysisReport(db, gameId);
    const cards = await generateReviewCards(state, targetSeat, report);
    insertReviewCards(db, cards);
    const stored = fetchReviewCards(db, gameId, targetSeat);
    return NextResponse.json({ ok: true, data: stored.length > 0 ? stored : cards });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
