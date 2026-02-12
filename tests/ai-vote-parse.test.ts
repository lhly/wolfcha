import test from "node:test";
import assert from "node:assert/strict";
import { parseVoteDecision } from "../src/lib/ai-eval";

test("parseVoteDecision extracts structured fields", () => {
  const raw = '{"seat":3,"reason":"票型不一致","evidence_tags":["vote_history","public_claims"],"counter":"若能解释改票则需重评","consistency":"一致","confidence":0.6}';
  const parsed = parseVoteDecision(raw);
  assert.ok(parsed);
  assert.equal(parsed?.seat, 3);
  assert.equal(parsed?.reason, "票型不一致");
  assert.deepEqual(parsed?.evidence_tags, ["vote_history", "public_claims"]);
});
