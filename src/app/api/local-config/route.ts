import { NextResponse } from "next/server";
import { getDb } from "@/lib/sqlite";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getDb();
    const row = db.prepare("SELECT * FROM llm_config WHERE id = 1").get() as
      | { base_url: string; api_key: string; model: string; updated_at: number }
      | undefined;
    return NextResponse.json({ ok: true, data: row ?? null });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as { base_url?: string; api_key?: string; model?: string };
    const baseUrl = (body.base_url ?? "").trim();
    const apiKey = (body.api_key ?? "").trim();
    const model = (body.model ?? "").trim();
    if (!baseUrl || !apiKey || !model) {
      return NextResponse.json({ ok: false, error: "Missing config fields" }, { status: 400 });
    }
    const db = getDb();
    db.prepare(
      "INSERT INTO llm_config (id, base_url, api_key, model, updated_at) VALUES (1, ?, ?, ?, ?) " +
        "ON CONFLICT(id) DO UPDATE SET base_url=excluded.base_url, api_key=excluded.api_key, " +
        "model=excluded.model, updated_at=excluded.updated_at"
    ).run(baseUrl, apiKey, model, Date.now());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
