import test from "node:test";
import assert from "node:assert/strict";
import { buildGameAnalysisReport } from "@/lib/game-analysis-api";

test("buildGameAnalysisReport attaches messages", () => {
  const data = { gameId: "g1", result: "wolf_win" } as any;
  const messages = [{ id: "m1", content: "hi" }];
  const report = buildGameAnalysisReport(data, messages as any);
  assert.equal(report.gameId, "g1");
  assert.equal(report.messages.length, 1);
});
