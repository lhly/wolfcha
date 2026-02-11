import { authenticator } from "otplib";

const TOTP_SECRET = process.env.TOTP_SECRET ?? "";

export const TOTP_COOKIE_NAME = "wolfcha.totp";
export const TOTP_COOKIE_MAX_AGE = 60 * 60 * 24;

// Allow slight clock drift (30s window)
authenticator.options = { window: 1 };

export function isTotpConfigured() {
  return Boolean(TOTP_SECRET);
}

export function verifyTotpCode(code: string) {
  if (!TOTP_SECRET) return false;
  const value = code.trim();
  if (!value) return false;
  return authenticator.check(value, TOTP_SECRET);
}
