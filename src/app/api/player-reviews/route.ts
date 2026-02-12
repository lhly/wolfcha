import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: false, error: "Not implemented" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ ok: false, error: "Not implemented" }, { status: 501 });
}
