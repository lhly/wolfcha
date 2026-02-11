import { authenticator } from "otplib";
import type { BufferEncoding } from "node:buffer";

const TOTP_SECRET = process.env.TOTP_SECRET ?? "";
const TOTP_DIGITS_RAW = process.env.TOTP_DIGITS ?? "";
const TOTP_ALGORITHM_RAW = process.env.TOTP_ALGORITHM ?? "";

export const TOTP_COOKIE_NAME = "wolfcha.totp";
export const TOTP_COOKIE_MAX_AGE = 60 * 60 * 24;

const DEFAULT_DIGITS = 6;
const DEFAULT_ALGORITHM = "sha1" as const;
const VALID_DIGITS = new Set([6, 8]);
const VALID_ALGORITHMS = new Set(["sha1", "sha256", "sha512"]);

// Most apps use the raw secret bytes directly (no RFC padding).
function createHmacKeyRaw(_algorithm: string, secret: string, encoding: string) {
  const normalizedEncoding = (encoding || "hex") as BufferEncoding;
  return Buffer.from(secret, normalizedEncoding).toString("hex");
}

function parseDigits(raw: string) {
  if (!raw) return DEFAULT_DIGITS;
  const value = Number(raw);
  if (VALID_DIGITS.has(value)) return value;
  console.warn(`[TOTP] Invalid TOTP_DIGITS="${raw}", fallback to ${DEFAULT_DIGITS}.`);
  return DEFAULT_DIGITS;
}

function parseAlgorithm(raw: string) {
  if (!raw) return DEFAULT_ALGORITHM;
  const value = raw.trim().toLowerCase();
  if (VALID_ALGORITHMS.has(value)) return value as typeof DEFAULT_ALGORITHM | "sha256" | "sha512";
  console.warn(`[TOTP] Invalid TOTP_ALGORITHM="${raw}", fallback to ${DEFAULT_ALGORITHM}.`);
  return DEFAULT_ALGORITHM;
}

// Allow slight clock drift (30s window)
authenticator.options = {
  window: 1,
  digits: parseDigits(TOTP_DIGITS_RAW),
  algorithm: parseAlgorithm(TOTP_ALGORITHM_RAW),
  createHmacKey: createHmacKeyRaw,
};

export function isTotpConfigured() {
  return Boolean(TOTP_SECRET);
}

export function verifyTotpCode(code: string) {
  if (!TOTP_SECRET) return false;
  const value = code.trim();
  if (!value) return false;
  return authenticator.check(value, TOTP_SECRET);
}
