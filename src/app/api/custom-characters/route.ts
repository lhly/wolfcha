import { NextResponse } from "next/server";
import { getDb } from "@/lib/sqlite";

export const runtime = "nodejs";

type CharacterRow = {
  id: string;
  display_name: string;
  gender: string;
  age: number;
  mbti: string;
  basic_info: string | null;
  style_label: string | null;
  avatar_seed: string | null;
  is_deleted: number;
  created_at: string;
  updated_at: string;
};

function mapRow(row: CharacterRow) {
  return {
    ...row,
    is_deleted: row.is_deleted === 1,
  };
}

export async function GET() {
  try {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM custom_characters WHERE is_deleted = 0 ORDER BY created_at DESC")
      .all() as CharacterRow[];
    return NextResponse.json({ ok: true, data: rows.map(mapRow) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<CharacterRow>;
    const now = new Date().toISOString();
    const id = body.id ?? (crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`);
    const displayName = (body.display_name ?? "").trim();
    if (!displayName) {
      return NextResponse.json({ ok: false, error: "Missing display_name" }, { status: 400 });
    }
    const row: CharacterRow = {
      id,
      display_name: displayName,
      gender: body.gender ?? "nonbinary",
      age: body.age ?? 0,
      mbti: body.mbti ?? "",
      basic_info: body.basic_info ?? null,
      style_label: body.style_label ?? null,
      avatar_seed: body.avatar_seed ?? null,
      is_deleted: 0,
      created_at: body.created_at ?? now,
      updated_at: body.updated_at ?? now,
    };
    const db = getDb();
    db.prepare(
      `INSERT INTO custom_characters
        (id, display_name, gender, age, mbti, basic_info, style_label, avatar_seed, is_deleted, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      row.id,
      row.display_name,
      row.gender,
      row.age,
      row.mbti,
      row.basic_info,
      row.style_label,
      row.avatar_seed,
      row.is_deleted,
      row.created_at,
      row.updated_at
    );
    return NextResponse.json({ ok: true, data: mapRow(row) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Partial<CharacterRow>;
    if (!body.id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }
    const db = getDb();
    const existing = db
      .prepare("SELECT * FROM custom_characters WHERE id = ?")
      .get(body.id) as CharacterRow | undefined;
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Character not found" }, { status: 404 });
    }
    const updated: CharacterRow = {
      ...existing,
      display_name: body.display_name?.trim() ?? existing.display_name,
      gender: body.gender ?? existing.gender,
      age: body.age ?? existing.age,
      mbti: body.mbti ?? existing.mbti,
      basic_info: body.basic_info ?? existing.basic_info,
      style_label: body.style_label ?? existing.style_label,
      avatar_seed: body.avatar_seed ?? existing.avatar_seed,
      is_deleted: body.is_deleted ?? existing.is_deleted,
      updated_at: body.updated_at ?? new Date().toISOString(),
    };
    db.prepare(
      `UPDATE custom_characters SET
        display_name = ?, gender = ?, age = ?, mbti = ?, basic_info = ?, style_label = ?,
        avatar_seed = ?, is_deleted = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      updated.display_name,
      updated.gender,
      updated.age,
      updated.mbti,
      updated.basic_info,
      updated.style_label,
      updated.avatar_seed,
      updated.is_deleted,
      updated.updated_at,
      updated.id
    );
    return NextResponse.json({ ok: true, data: mapRow(updated) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }
    const db = getDb();
    db.prepare("UPDATE custom_characters SET is_deleted = 1, updated_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      id
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
