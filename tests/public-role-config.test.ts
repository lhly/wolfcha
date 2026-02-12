import test from "node:test";
import assert from "node:assert/strict";
import { createInitialGameState } from "../src/lib/game-master";
import { normalizeGameStateForTest } from "../src/store/game-machine";

test("normalize preserves publicRoleConfig", () => {
  const state = {
    ...createInitialGameState(),
    publicRoleConfig: { Werewolf: 3, Seer: 1 },
  };
  const normalized = normalizeGameStateForTest(state);
  assert.equal(normalized.publicRoleConfig?.Werewolf, 3);
  assert.equal(normalized.publicRoleConfig?.Seer, 1);
});
