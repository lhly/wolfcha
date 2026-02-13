import { NextResponse } from "next/server";
import { getDb } from "@/lib/sqlite";
import { parseGameAnalysisRequestBody } from "@/lib/game-analysis-request";
import { fetchGameAnalysisReport, upsertGameAnalysisReport } from "@/lib/game-analysis-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("game_id")?.trim();
    if (!gameId) {
      return NextResponse.json({ ok: false, error: "Missing game_id" }, { status: 400 });
    }
    const db = getDb();
    const report = fetchGameAnalysisReport(db, gameId);
    return NextResponse.json({ ok: true, data: report });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = parseGameAnalysisRequestBody(raw);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    }
    const { gameId, report } = parsed.value;
    const db = getDb();
    upsertGameAnalysisReport(db, gameId, report);
    const stored = fetchGameAnalysisReport(db, gameId);
    return NextResponse.json({ ok: true, data: stored ?? report });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
