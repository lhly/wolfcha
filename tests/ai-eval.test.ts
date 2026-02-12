import test from "node:test";
import assert from "node:assert/strict";
import { evaluateVoteDecision, evaluateSpeechDecision } from "../src/lib/ai-eval";

test("evaluateVoteDecision rejects attackiness-only", () => {
  const result = evaluateVoteDecision({
    seat: 3,
    reason: "他太攻击性了",
    evidence_tags: ["speech_consistency"],
    counter: "无",
    consistency: "一致",
  });
  assert.equal(result.ok, false);
});

test("evaluateVoteDecision accepts multi-evidence with counter", () => {
  const result = evaluateVoteDecision({
    seat: 3,
    reason: "票型和公开宣称不一致",
    evidence_tags: ["vote_history", "public_claims"],
    counter: "若其能解释改票理由，需要重新评估",
    consistency: "与我今日发言一致",
    confidence: 0.6,
  });
  assert.equal(result.ok, true);
});

test("evaluateSpeechDecision validates rationale", () => {
  const result = evaluateSpeechDecision({
    speech: ["我更关注票型变化。"],
    rationale: {
      evidence_tags: ["vote_history", "death_timeline"],
      counter: "如果能解释改票动机则需修正",
      consistency: "与我今日观点一致",
      confidence: 0.55,
    },
  });
  assert.equal(result.ok, true);
});
