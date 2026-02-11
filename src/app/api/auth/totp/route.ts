import { NextResponse } from "next/server";
import { isTotpConfigured, verifyTotpCode, TOTP_COOKIE_MAX_AGE, TOTP_COOKIE_NAME } from "@/lib/totp";

export async function POST(req: Request) {
  let body: { code?: string } = {};
  try {
    body = (await req.json()) as { code?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  if (!isTotpConfigured()) {
    return NextResponse.json({ ok: false, error: "TOTP not configured" }, { status: 500 });
  }

  const code = body.code?.trim() ?? "";
  if (!code) {
    return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });
  }

  if (!verifyTotpCode(code)) {
    return NextResponse.json({ ok: false, error: "Invalid code" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(TOTP_COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TOTP_COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
