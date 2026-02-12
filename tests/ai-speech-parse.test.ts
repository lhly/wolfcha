import test from "node:test";
import assert from "node:assert/strict";
import { parseSpeechDecision } from "../src/lib/ai-eval";

test("parseSpeechDecision extracts speech and rationale", () => {
  const raw = '{"speech":["一句","二句"],"rationale":{"evidence_tags":["vote_history","death_timeline"],"counter":"反证","consistency":"一致","confidence":0.5}}';
  const parsed = parseSpeechDecision(raw);
  assert.ok(parsed);
  assert.deepEqual(parsed?.speech, ["一句", "二句"]);
  assert.deepEqual(parsed?.rationale?.evidence_tags, ["vote_history", "death_timeline"]);
});
