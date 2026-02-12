# LLM Reasoning Hard Eval Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Provide LLM players with structured public game context and enforce hard-evaluated reasoning output for day speech/vote.

**Architecture:** Add a public reasoning context builder in `prompt-utils`, extend game state with public role configuration, update prompts to demand structured reasoning JSON, and enforce hard evaluation with retries in vote and day-speech generation paths.

**Tech Stack:** TypeScript, Next.js, node:test (tsx), i18n JSON prompts.

---

### Task 1: Add public role configuration to game state

**Files:**
- Modify: `src/types/game.ts` (add `publicRoleConfig?: Record<Role, number>`)
- Modify: `src/lib/game-master.ts` (default in `createInitialGameState`)
- Modify: `src/hooks/useGameLogic.ts` (compute role counts on game start)
- Modify: `src/store/game-machine.ts` (validate/normalize `publicRoleConfig`)

**Step 1: Write failing test**

Create `tests/public-role-config.test.ts` with a minimal GameState and assert `publicRoleConfig` persists through normalize (new helper to expose normalize if needed).

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGameStateForTest } from "../src/store/game-machine";
import { createInitialGameState } from "../src/lib/game-master";

test("normalize preserves publicRoleConfig", () => {
  const state = { ...createInitialGameState(), publicRoleConfig: { Werewolf: 3, Seer: 1 } };
  const normalized = normalizeGameStateForTest(state);
  assert.equal(normalized.publicRoleConfig?.Werewolf, 3);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/public-role-config.test.ts`
Expected: FAIL with missing export or missing field.

**Step 3: Write minimal implementation**
- Add `publicRoleConfig` to `GameState`
- Add default `{}` in `createInitialGameState`
- Compute role counts in `useGameLogic` right after `setupPlayers`
- Update `isValidGameState` / `normalizeGameState` to accept/persist the field
- Export a test-only normalize helper (`normalizeGameStateForTest`) if needed

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/public-role-config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/game.ts src/lib/game-master.ts src/hooks/useGameLogic.ts src/store/game-machine.ts tests/public-role-config.test.ts
git commit -m "feat: add public role configuration to game state"
```

---

### Task 2: Build public reasoning context block

**Files:**
- Modify: `src/lib/prompt-utils.ts` (add `buildPublicReasoningContext`, append in `buildGameContext`)
- Test: `tests/prompt-utils-public-context.test.ts`

**Step 1: Write failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialGameState } from "../src/lib/game-master";
import { buildPublicReasoningContext } from "../src/lib/prompt-utils";

test("buildPublicReasoningContext includes role config, alive, death, votes", () => {
  const state = createInitialGameState();
  state.players = [
    { playerId: "a", seat: 0, displayName: "A", role: "Werewolf", alive: true, isHuman: false, alignment: "wolf" },
    { playerId: "b", seat: 1, displayName: "B", role: "Seer", alive: false, isHuman: false, alignment: "village" },
  ] as any;
  state.publicRoleConfig = { Werewolf: 1, Seer: 1 };
  state.voteHistory = { 1: { a: 1 } };
  state.dayHistory = { 1: { executed: { seat: 1, votes: 1 } } };

  const out = buildPublicReasoningContext(state);
  assert.ok(out.includes("role_config"));
  assert.ok(out.includes("alive_count"));
  assert.ok(out.includes("vote_history"));
  assert.ok(out.includes("death_timeline"));
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/prompt-utils-public-context.test.ts`
Expected: FAIL (missing export/function)

**Step 3: Write minimal implementation**
- Add `buildPublicReasoningContext(state)` in `prompt-utils`
  - role_config from `state.publicRoleConfig`
  - alive_count + alive_seats
  - death_timeline from `dayHistory` + `nightHistory` (public only)
  - vote_history from `dailySummaryVoteData` else from `voteHistory`/`badge.history`
- Append result to `buildGameContext`

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/prompt-utils-public-context.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/prompt-utils.ts tests/prompt-utils-public-context.test.ts
git commit -m "feat: add public reasoning context to prompts"
```

---

### Task 3: Update prompts for structured reasoning

**Files:**
- Modify: `src/i18n/messages/zh.json`
- Modify: `src/i18n/messages/en.json`

**Step 1: Update vote prompts**
- `prompts.vote.user`: require JSON with `seat/reason/evidence_tags/counter/consistency/confidence`
- `prompts.vote.task`: list evidence_tags categories

**Step 2: Update day speech prompts**
- `prompts.daySpeech.user`: require JSON object with `speech` array + `rationale` object
- `prompts.daySpeech.guidelines.default`: add requirement for evidence + counter + consistency

**Step 3: Commit**

```bash
git add src/i18n/messages/zh.json src/i18n/messages/en.json
git commit -m "feat: require structured reasoning outputs in prompts"
```

---

### Task 4: Add hard evaluation helpers

**Files:**
- Create: `src/lib/ai-eval.ts`
- Test: `tests/ai-eval.test.ts`

**Step 1: Write failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { evaluateVoteDecision } from "../src/lib/ai-eval";

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
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/ai-eval.test.ts`
Expected: FAIL (missing module)

**Step 3: Write minimal implementation**
- Add `evaluateVoteDecision` / `evaluateSpeechDecision`
- Enforce: evidence_tags >= 2, counter/consistency non-empty
- Detect attackiness-only reasons via keyword list

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/ai-eval.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/ai-eval.ts tests/ai-eval.test.ts
git commit -m "feat: add hard-eval helpers for AI reasoning"
```

---

### Task 5: Enforce hard-eval in votes

**Files:**
- Modify: `src/lib/game-master.ts`

**Step 1: Write failing test**

Create `tests/ai-vote-parse.test.ts` to validate that `parseVoteDecision` (new helper) handles JSON with reason/evidence.

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/ai-vote-parse.test.ts`
Expected: FAIL (missing helper)

**Step 3: Write minimal implementation**
- Add `parseVoteDecision` helper in `game-master.ts` (or `ai-eval.ts`)
- Update `generateAIVote` to:
  - parse JSON object
  - evaluate with `evaluateVoteDecision`
  - retry with correction prompt (max 2)
  - fallback to random if still invalid

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/ai-vote-parse.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/game-master.ts tests/ai-vote-parse.test.ts
git commit -m "feat: hard-eval and retry AI vote decisions"
```

---

### Task 6: Enforce hard-eval in day speech (non-stream)

**Files:**
- Modify: `src/lib/game-master.ts` (add `generateAISpeechSegmentsHardEval`)
- Modify: `src/hooks/game-phases/useDayPhase.ts` (toggle hard-eval path)
- Modify: `src/lib/game-constants.ts` (add hard-eval flag + retry limits)

**Step 1: Write failing test**

Create `tests/ai-speech-parse.test.ts` for `parseSpeechDecision` helper.

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/ai-speech-parse.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- Add `parseSpeechDecision` helper and `generateAISpeechSegmentsHardEval`
- If hard-eval enabled, `useDayPhase` should call hard-eval generator and enqueue segments

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/ai-speech-parse.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/game-master.ts src/hooks/game-phases/useDayPhase.ts src/lib/game-constants.ts tests/ai-speech-parse.test.ts
git commit -m "feat: hard-eval day speech generation"
```

---

### Task 7: Full test sweep

**Step 1: Run unit tests**

Run: `pnpm test:unit`
Expected: PASS

**Step 2: Run smoke test**

Run: `pnpm test`
Expected: Smoke test passed

**Step 3: Commit (if needed)**

```bash
git add -A
git commit -m "test: verify hard-eval reasoning changes"
```
