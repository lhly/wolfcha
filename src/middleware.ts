import { NextRequest, NextResponse } from "next/server";

const LOCALE_COOKIE = "wolfcha.locale";
const TOTP_COOKIE = "wolfcha.totp";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    if (pathname.startsWith("/api/auth/totp")) {
      return NextResponse.next();
    }
    const authed = request.cookies.get(TOTP_COOKIE)?.value === "1";
    if (!authed) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Skip static files and paths that already have locale
  if (pathname.startsWith("/zh") || pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Check if user has a saved locale preference (cookie)
  const savedLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (savedLocale === "zh") {
    const url = new URL(pathname === "/" ? "/zh" : `/zh${pathname}`, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }
  if (savedLocale === "en") {
    // User explicitly chose English, stay on current path
    return NextResponse.next();
  }

  // No saved preference: detect browser language from Accept-Language header
  const acceptLanguage = request.headers.get("accept-language") || "";
  const prefersChinese = acceptLanguage
    .split(",")
    .some((lang) => lang.trim().toLowerCase().startsWith("zh"));

  if (prefersChinese) {
    const url = new URL(pathname === "/" ? "/zh" : `/zh${pathname}`, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next|.*\\..*).*)"],
};
