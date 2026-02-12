import test from "node:test";
import assert from "node:assert/strict";
import { resolveAISpeechMode } from "../src/lib/ai-speech-strategy";

test("resolveAISpeechMode returns hard when hard eval enabled and streaming disabled", () => {
  const mode = resolveAISpeechMode({ enabled: true, disableStreamingSpeech: true });
  assert.equal(mode, "hard");
});

test("resolveAISpeechMode returns stream when hard eval disabled", () => {
  const mode = resolveAISpeechMode({ enabled: false, disableStreamingSpeech: true });
  assert.equal(mode, "stream");
});

test("resolveAISpeechMode returns stream when streaming not disabled", () => {
  const mode = resolveAISpeechMode({ enabled: true, disableStreamingSpeech: false });
  assert.equal(mode, "stream");
});
