import test from "node:test";
import assert from "node:assert/strict";
import { isReviewLengthValid } from "@/lib/player-reviews";

test("review length validation", () => {
  assert.equal(isReviewLengthValid("短".repeat(199)), false);
  assert.equal(isReviewLengthValid("中".repeat(200)), true);
  assert.equal(isReviewLengthValid("长".repeat(800)), true);
  assert.equal(isReviewLengthValid("超".repeat(801)), false);
});

test("buildReviewPrompt includes target and reviewer seats", async () => {
  const { buildReviewPrompt } = await import("@/lib/player-reviews");
  const state = {
    gameId: "game-1",
    day: 3,
    winner: "wolf",
    players: [
      { playerId: "p1", seat: 0, displayName: "一号", role: "Villager", alignment: "village", alive: true, isHuman: true },
      { playerId: "p2", seat: 1, displayName: "二号", role: "Werewolf", alignment: "wolf", alive: true, isHuman: false },
    ],
    messages: [],
  } as any;
  const target = state.players[0];
  const reviewer = state.players[1];
  const prompt = buildReviewPrompt(state, target, reviewer);
  assert.ok(prompt.includes("1号"));
  assert.ok(prompt.includes("2号"));
});

test("buildReviewPrompt includes all player messages", async () => {
  const { buildReviewPrompt } = await import("@/lib/player-reviews");
  const state = {
    gameId: "game-1",
    day: 2,
    winner: "village",
    players: [
      { playerId: "p1", seat: 0, displayName: "一号", role: "Villager", alignment: "village", alive: true, isHuman: true },
      { playerId: "p2", seat: 1, displayName: "二号", role: "Werewolf", alignment: "wolf", alive: true, isHuman: false },
    ],
    messages: [
      { id: "m1", playerId: "p1", playerName: "一号", content: "我是好人", timestamp: 1 },
      { id: "m2", playerId: "p2", playerName: "二号", content: "我是狼人", timestamp: 2 },
    ],
    dailySummaries: {},
  } as any;
  const target = state.players[0];
  const reviewer = state.players[1];
  const prompt = buildReviewPrompt(state, target, reviewer);
  assert.ok(prompt.includes("我是好人"));
  assert.ok(prompt.includes("我是狼人"));
});

test("coerceReviewLength clamps content", async () => {
  const { coerceReviewLength, getTextLength } = await import("@/lib/player-reviews");
  const short = "短".repeat(199);
  const long = "长".repeat(801);
  const padded = coerceReviewLength(short);
  const trimmed = coerceReviewLength(long);
  assert.ok(getTextLength(padded) >= 200);
  assert.equal(getTextLength(trimmed), 800);
});

test("buildReviewPlan includes all LLM reviewers", async () => {
  const { buildReviewPlan } = await import("@/lib/player-reviews");
  const state = {
    gameId: "game-2",
    day: 2,
    winner: "village",
    players: [
      { playerId: "p1", seat: 0, displayName: "一号", role: "Villager", alignment: "village", alive: true, isHuman: true },
      { playerId: "p2", seat: 1, displayName: "二号", role: "Werewolf", alignment: "wolf", alive: true, isHuman: false },
      { playerId: "p3", seat: 2, displayName: "三号", role: "Seer", alignment: "village", alive: true, isHuman: false },
    ],
    messages: [],
  } as any;

  const planHuman = buildReviewPlan(state, 1);
  assert.equal(planHuman.length, 2);
  assert.ok(planHuman.some((p) => p.reviewerSeat === 2));
  assert.ok(planHuman.some((p) => p.reviewerSeat === 3));

  const planLlm = buildReviewPlan(state, 2);
  assert.equal(planLlm.length, 2);
  assert.ok(planLlm.some((p) => p.reviewerSeat === 2));
  assert.ok(planLlm.some((p) => p.reviewerSeat === 3));
});
