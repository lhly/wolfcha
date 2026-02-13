import test from "node:test";
import assert from "node:assert/strict";
import { normalizeReviewRequestBody } from "@/lib/player-reviews-request";

test("normalizeReviewRequestBody accepts numeric seat", () => {
  const result = normalizeReviewRequestBody({ game_id: "game-1", target_seat: 1 });
  assert.deepEqual(result, { gameId: "game-1", targetSeat: 1, force: false });
});

test("normalizeReviewRequestBody accepts string seat", () => {
  const result = normalizeReviewRequestBody({ game_id: "game-1", target_seat: "2", force: true });
  assert.deepEqual(result, { gameId: "game-1", targetSeat: 2, force: true });
});

test("normalizeReviewRequestBody accepts JSON string payload", () => {
  const raw = JSON.stringify({ game_id: "game-1", target_seat: 3 });
  const result = normalizeReviewRequestBody(raw);
  assert.deepEqual(result, { gameId: "game-1", targetSeat: 3, force: false });
});

test("normalizeReviewRequestBody returns null on invalid payload", () => {
  assert.equal(normalizeReviewRequestBody({}), null);
  assert.equal(normalizeReviewRequestBody({ game_id: "", target_seat: 1 }), null);
  assert.equal(normalizeReviewRequestBody({ game_id: "game-1", target_seat: 0 }), null);
  assert.equal(normalizeReviewRequestBody("not-json"), null);
});
