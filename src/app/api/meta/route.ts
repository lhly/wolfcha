import { NextResponse } from "next/server";
import { getDb } from "@/lib/sqlite";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (key) {
      const row = db.prepare("SELECT value FROM meta_kv WHERE key = ?").get(key) as
        | { value: string }
        | undefined;
      return NextResponse.json({ ok: true, data: row?.value ?? null });
    }
    const rows = db.prepare("SELECT key, value FROM meta_kv").all() as Array<{
      key: string;
      value: string;
    }>;
    return NextResponse.json({ ok: true, data: rows });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as { key?: string; value?: string };
    const key = (body.key ?? "").trim();
    if (!key) {
      return NextResponse.json({ ok: false, error: "Missing key" }, { status: 400 });
    }
    const value = body.value ?? "";
    const db = getDb();
    db.prepare(
      "INSERT INTO meta_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
    ).run(key, value);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
