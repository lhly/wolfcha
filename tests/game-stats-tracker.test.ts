import test from "node:test";
import assert from "node:assert/strict";
import { gameStatsTracker } from "@/lib/game-stats-tracker";

test("gameStatsTracker addAiCall updates counters", () => {
  gameStatsTracker.reset();
  gameStatsTracker.start({ playerCount: 10, usedCustomKey: false });
  gameStatsTracker.addAiCall({ inputChars: 5, outputChars: 7, promptTokens: 3, completionTokens: 4 });
  const summary = gameStatsTracker.getSummary("wolf", true);
  assert.ok(summary);
  assert.equal(summary?.aiCallsCount, 1);
  assert.equal(summary?.aiInputChars, 5);
  assert.equal(summary?.aiOutputChars, 7);
  assert.equal(summary?.aiPromptTokens, 3);
  assert.equal(summary?.aiCompletionTokens, 4);
});
