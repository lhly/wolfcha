import test from "node:test";
import assert from "node:assert/strict";
import { getChatApiTimeoutMs } from "../src/lib/chat-timeout";

test("getChatApiTimeoutMs uses default when env is missing", () => {
  const prev = process.env.CHAT_API_TIMEOUT_MS;
  delete process.env.CHAT_API_TIMEOUT_MS;
  try {
    assert.equal(getChatApiTimeoutMs(), 60000);
  } finally {
    if (prev === undefined) {
      delete process.env.CHAT_API_TIMEOUT_MS;
    } else {
      process.env.CHAT_API_TIMEOUT_MS = prev;
    }
  }
});

test("getChatApiTimeoutMs uses env value when valid", () => {
  const prev = process.env.CHAT_API_TIMEOUT_MS;
  process.env.CHAT_API_TIMEOUT_MS = "120000";
  try {
    assert.equal(getChatApiTimeoutMs(), 120000);
  } finally {
    if (prev === undefined) {
      delete process.env.CHAT_API_TIMEOUT_MS;
    } else {
      process.env.CHAT_API_TIMEOUT_MS = prev;
    }
  }
});

test("getChatApiTimeoutMs falls back when env is invalid", () => {
  const prev = process.env.CHAT_API_TIMEOUT_MS;
  process.env.CHAT_API_TIMEOUT_MS = "not-a-number";
  try {
    assert.equal(getChatApiTimeoutMs(), 60000);
  } finally {
    if (prev === undefined) {
      delete process.env.CHAT_API_TIMEOUT_MS;
    } else {
      process.env.CHAT_API_TIMEOUT_MS = prev;
    }
  }
});
