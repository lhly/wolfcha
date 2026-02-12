import test from "node:test";
import assert from "node:assert/strict";
import { isReviewLengthValid } from "@/lib/player-reviews";

test("review length validation", () => {
  assert.equal(isReviewLengthValid("短".repeat(199)), false);
  assert.equal(isReviewLengthValid("中".repeat(200)), true);
  assert.equal(isReviewLengthValid("长".repeat(800)), true);
  assert.equal(isReviewLengthValid("超".repeat(801)), false);
});
