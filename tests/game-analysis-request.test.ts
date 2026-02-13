import test from "node:test";
import assert from "node:assert/strict";
import { parseGameAnalysisRequestBody } from "@/lib/game-analysis-request";

test("parseGameAnalysisRequestBody accepts object payload", () => {
  const parsed = parseGameAnalysisRequestBody({ game_id: "game-1", report: { gameId: "game-1" } });
  assert.equal(parsed.ok, true);
});

test("parseGameAnalysisRequestBody accepts JSON string payload", () => {
  const parsed = parseGameAnalysisRequestBody(
    JSON.stringify({ game_id: "game-1", report: { gameId: "game-1" } })
  );
  assert.equal(parsed.ok, true);
});

test("parseGameAnalysisRequestBody rejects missing game_id", () => {
  const parsed = parseGameAnalysisRequestBody({ report: {} });
  assert.equal(parsed.ok, false);
});

test("parseGameAnalysisRequestBody rejects missing report", () => {
  const parsed = parseGameAnalysisRequestBody({ game_id: "game-1" });
  assert.equal(parsed.ok, false);
});
