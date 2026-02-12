import { NextResponse } from "next/server";
import { getDb } from "@/lib/sqlite";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getDb();
    const row = db.prepare("SELECT * FROM llm_config WHERE id = 1").get() as
      | { base_url: string; api_key: string; model: string; models_json?: string | null; updated_at: number }
      | undefined;
    return NextResponse.json({ ok: true, data: row ?? null });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as {
      base_url?: string;
      api_key?: string;
      model?: string;
      models?: string[];
      models_json?: string;
    };
    const baseUrl = (body.base_url ?? "").trim();
    const apiKey = (body.api_key ?? "").trim();
    let models: string[] = [];
    if (Array.isArray(body.models)) {
      models = body.models;
    } else if (typeof body.models_json === "string" && body.models_json.trim()) {
      try {
        const parsed = JSON.parse(body.models_json);
        if (Array.isArray(parsed)) models = parsed;
      } catch {
        models = [];
      }
    }
    if (models.length === 0) {
      const fallback = (body.model ?? "").trim();
      if (fallback) models = [fallback];
    }
    const normalizedModels = Array.from(
      new Set(models.map((m) => String(m ?? "").trim()).filter(Boolean))
    );
    const model = normalizedModels[0] ?? "";
    const modelsJson = JSON.stringify(normalizedModels);
    if (!baseUrl || !apiKey || !model) {
      return NextResponse.json({ ok: false, error: "Missing config fields" }, { status: 400 });
    }
    const db = getDb();
    db.prepare(
      "INSERT INTO llm_config (id, base_url, api_key, model, models_json, updated_at) VALUES (1, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(id) DO UPDATE SET base_url=excluded.base_url, api_key=excluded.api_key, " +
        "model=excluded.model, models_json=excluded.models_json, updated_at=excluded.updated_at"
    ).run(baseUrl, apiKey, model, modelsJson, Date.now());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
