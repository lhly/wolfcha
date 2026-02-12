import test from "node:test";
import assert from "node:assert/strict";
import { createInitialGameState } from "../src/lib/game-master";
import { buildPublicReasoningContext } from "../src/lib/prompt-utils";

const makePlayer = (overrides: Partial<import("../src/types/game").Player>) => ({
  playerId: overrides.playerId ?? "p1",
  seat: overrides.seat ?? 0,
  displayName: overrides.displayName ?? "P1",
  alive: overrides.alive ?? true,
  role: overrides.role ?? "Villager",
  alignment: overrides.alignment ?? "village",
  isHuman: overrides.isHuman ?? false,
  ...overrides,
});

test("buildPublicReasoningContext includes role config, alive, death, votes", () => {
  const state = createInitialGameState();
  state.players = [
    makePlayer({ playerId: "a", seat: 0, displayName: "A", role: "Werewolf", alignment: "wolf", alive: true }),
    makePlayer({ playerId: "b", seat: 1, displayName: "B", role: "Seer", alignment: "village", alive: false }),
  ];
  state.publicRoleConfig = { Werewolf: 1, Seer: 1 };
  state.voteHistory = { 1: { a: 1 } };
  state.dayHistory = { 1: { executed: { seat: 1, votes: 1 } } };

  const out = buildPublicReasoningContext(state);
  assert.ok(out.includes("role_config"));
  assert.ok(out.includes("alive_count"));
  assert.ok(out.includes("vote_history"));
  assert.ok(out.includes("death_timeline"));
});
