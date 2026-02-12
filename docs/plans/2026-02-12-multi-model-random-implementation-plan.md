# Multi-Model Random Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add tag-based candidate model selection with save-time /models validation and runtime fallback, enabling multi-model random assignment per AI player.

**Architecture:** Persist a `models[]` list alongside the legacy `model` field. Validate candidates on save via a new server-side `/api/llm-models` proxy (fallback if unsupported). `sampleModelRefs()` draws from the validated list; invalid models are removed at runtime with fallback to the primary model.

**Tech Stack:** Next.js (App Router), React, SQLite (better-sqlite3), pnpm, existing smoke-test script.

---

### Task 1: Extend LLM config storage to support models[]

**Files:**
- Modify: `src/lib/sqlite.ts`
- Modify: `src/app/api/local-config/route.ts`
- Modify: `src/lib/llm-config.ts`
- Modify: `src/lib/api-keys.ts`
- Modify: `src/app/page.tsx`
- Modify: `scripts/smoke-test.mjs`

**Step 1: Write the failing test**
- Add smoke-test checks for `models_json` support and updated local-config route.

```js
check(readFile("src/lib/sqlite.ts").includes("models_json"), "Missing models_json column for llm_config.");
check(readFile("src/app/api/local-config/route.ts").includes("models_json"), "local-config route should handle models_json.");
```

**Step 2: Run test to verify it fails**
Run: `pnpm test`
Expected: FAIL with missing `models_json` checks.

**Step 3: Write minimal implementation**
- Add `models_json TEXT` column to `llm_config` via a new `ensureLlmConfigColumns()` in `src/lib/sqlite.ts`.
- Update local-config route to read/write `models_json` (JSON string), still persisting `model` as first element.
- Update `LlmConfig` and normalization to parse `models_json` → `models[]` (fallback to `[model]`).
- Update `saveLlmConfig()` to send `models_json` and primary `model`.
- Update `getSelectedModels()` / `setSelectedModels()` in `api-keys.ts` to use arrays.
- Update `src/app/page.tsx` to select `models_json` and pass to `HomeClient`.

**Step 4: Run test to verify it passes**
Run: `pnpm test`
Expected: PASS.

**Step 5: Commit**
```
git add src/lib/sqlite.ts src/app/api/local-config/route.ts src/lib/llm-config.ts src/lib/api-keys.ts src/app/page.tsx scripts/smoke-test.mjs
git commit -m "feat: store multi-model candidates in llm config"
```

---

### Task 2: Add /api/llm-models proxy for /models validation

**Files:**
- Create: `src/app/api/llm-models/route.ts`
- Modify: `scripts/smoke-test.mjs`

**Step 1: Write the failing test**
Add a smoke-test check that the route exists and references `/models`.

```js
check(exists("src/app/api/llm-models/route.ts"), "Missing /api/llm-models route.");
check(readFile("src/app/api/llm-models/route.ts").includes("/models"), "llm-models route should call /models.");
```

**Step 2: Run test to verify it fails**
Run: `pnpm test`
Expected: FAIL with missing route.

**Step 3: Write minimal implementation**
- Implement POST handler accepting `{ base_url, api_key }`.
- Normalize base URL (trim trailing `/`).
- Fetch `${baseUrl}/models` with `Authorization: Bearer <api_key>`.
- Return `{ ok: true, models: string[] }` when possible; on error return `{ ok: false, error }` with non-200 status.

**Step 4: Run test to verify it passes**
Run: `pnpm test`
Expected: PASS.

**Step 5: Commit**
```
git add src/app/api/llm-models/route.ts scripts/smoke-test.mjs
git commit -m "feat: add llm models validation proxy"
```

---

### Task 3: Tag-based candidate input + save-time validation

**Files:**
- Modify: `src/components/game/LocalModelSettingsModal.tsx`
- Modify: `src/lib/llm-config.ts` (if helper needed)
- Modify: `src/components/game/WelcomeScreen.tsx`

**Step 1: Write the failing test**
Add a smoke-test check for `modelTags` or `models` usage in `LocalModelSettingsModal`.

```js
check(readFile("src/components/game/LocalModelSettingsModal.tsx").includes("modelTags"), "LocalModelSettingsModal should manage modelTags.");
```

**Step 2: Run test to verify it fails**
Run: `pnpm test`
Expected: FAIL (no tag input yet).

**Step 3: Write minimal implementation**
- Add `modelInput` + `modelTags: string[]` state.
- On Enter / comma / space: add trimmed tag, de-dup.
- Render tags with X remove buttons.
- On save:
  - Validate baseUrl/apiKey + at least 1 tag.
  - Call `/api/llm-models` with current baseUrl/apiKey.
  - If ok: intersect tags with returned list; toast removed models.
  - If error: toast fallback message (skip save-time validation).
  - Save config with `models` array and `model = models[0]`.
- Update `WelcomeScreen` badge to show primary model + count (use i18n `modelCount` if multiple).

**Step 4: Run test to verify it passes**
Run: `pnpm test`
Expected: PASS.

**Step 5: Commit**
```
git add src/components/game/LocalModelSettingsModal.tsx src/components/game/WelcomeScreen.tsx scripts/smoke-test.mjs
git commit -m "feat: add tag input and save-time model validation"
```

---

### Task 4: Random assignment + runtime fallback

**Files:**
- Modify: `src/lib/character-generator.ts`
- Modify: `src/lib/api-keys.ts`
- Modify: `src/lib/llm.ts` (optional invalid-model detector)
- Modify: `src/lib/game-master.ts` (fallback handler)

**Step 1: Write the failing test**
Add a smoke-test check that `sampleModelRefs` uses `getSelectedModels`.

```js
check(readFile("src/lib/character-generator.ts").includes("getSelectedModels"), "sampleModelRefs should use getSelectedModels.");
```

**Step 2: Run test to verify it fails**
Run: `pnpm test`
Expected: FAIL (still single-model).

**Step 3: Write minimal implementation**
- Update `sampleModelRefs` to use `getSelectedModels()` as candidate pool; shuffle and repeat as needed.
- If pool empty, fallback to `getGeneratorModel()`.
- Add invalid-model detection helper in `llm.ts` (e.g., message contains "model not found" / 404).
- In `game-master`, wrap LLM calls for players with retry-on-invalid-model:
  - If invalid model error: pick new model from pool, update `player.agentProfile.modelRef`, retry once.
  - If pool empty: fallback to `getGeneratorModel()`.

**Step 4: Run test to verify it passes**
Run: `pnpm test`
Expected: PASS.

**Step 5: Commit**
```
git add src/lib/character-generator.ts src/lib/llm.ts src/lib/game-master.ts scripts/smoke-test.mjs
git commit -m "feat: randomize models with invalid-model fallback"
```

---

### Task 5: Verification & Documentation

**Files:**
- Modify: `docs/plans/2026-02-12-multi-model-random-design.md`
- Modify: `docs/plans/2026-02-12-multi-model-random-implementation-plan.md`

**Step 1: Run full smoke test**
Run: `pnpm test`
Expected: PASS.

**Step 2: Manual sanity check**
- Open model settings modal, add 2–3 tags, save.
- Confirm toast for invalid models or fallback message.
- Start game and verify AI players show different model labels.

**Step 3: Commit**
```
git add docs/plans/2026-02-12-multi-model-random-design.md docs/plans/2026-02-12-multi-model-random-implementation-plan.md
git commit -m "docs: add multi-model random implementation plan"
```
