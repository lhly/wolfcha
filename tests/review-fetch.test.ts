import test from "node:test";
import assert from "node:assert/strict";
import { shouldAutoFetchReviews } from "@/components/analysis/review-fetch";

test("shouldAutoFetchReviews gates auto fetch", () => {
  assert.equal(
    shouldAutoFetchReviews({ hasItems: false, hasAttempted: false, isLoading: false, hasError: false }),
    true
  );
  assert.equal(
    shouldAutoFetchReviews({ hasItems: true, hasAttempted: false, isLoading: false, hasError: false }),
    false
  );
  assert.equal(
    shouldAutoFetchReviews({ hasItems: false, hasAttempted: true, isLoading: false, hasError: false }),
    false
  );
  assert.equal(
    shouldAutoFetchReviews({ hasItems: false, hasAttempted: false, isLoading: true, hasError: false }),
    false
  );
  assert.equal(
    shouldAutoFetchReviews({ hasItems: false, hasAttempted: false, isLoading: false, hasError: true }),
    false
  );
});

test("isValidReviewRequest validates gameId and seat", () => {
  const { isValidReviewRequest } = require("@/components/analysis/review-fetch") as typeof import("@/components/analysis/review-fetch");
  assert.equal(isValidReviewRequest("game-1", 1), true);
  assert.equal(isValidReviewRequest("", 1), false);
  assert.equal(isValidReviewRequest("  ", 1), false);
  assert.equal(isValidReviewRequest("game-1", 0), false);
  assert.equal(isValidReviewRequest("game-1", NaN), false);
});
