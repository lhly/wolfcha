import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveApiChatUrl } from "@/lib/llm";

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(vars)) {
    previous[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("resolveApiChatUrl prefers env origin on server", () => {
  withEnv({
    NEXT_PUBLIC_SITE_URL: "https://example.com",
    VERCEL_URL: undefined,
    PORT: "3000",
  }, () => {
    const url = resolveApiChatUrl("/api/chat");
    assert.equal(url, "https://example.com/api/chat");
  });
});

test("resolveApiChatUrl falls back to localhost:PORT when no origin env", () => {
  withEnv({
    NEXT_PUBLIC_SITE_URL: undefined,
    NEXT_PUBLIC_APP_URL: undefined,
    VERCEL_URL: undefined,
    PORT: "4321",
  }, () => {
    const url = resolveApiChatUrl("/api/chat");
    assert.equal(url, "http://localhost:4321/api/chat");
  });
});
