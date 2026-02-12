# Postgame Player Reviews Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Generate and store per-player LLM review cards (seat 1 at game end, others on click) and add avatar tab UI with collapsible cards.

**Architecture:** Add a `player_reviews` SQLite table (one card per row). Introduce a server-side generator that loads `game_history.state_json`, uses the reviewer’s in-game model (fallback to primary model) to create 200–800 char reviews, and exposes `GET/POST /api/player-reviews`. Update `POST /api/game-history` to generate seat 1 on completion. Frontend renders horizontal avatar tabs, fetches reviews per target seat, and shows collapsible cards.

**Tech Stack:** Next.js App Router (API routes), better-sqlite3, TypeScript, Tailwind/CSS, existing LLM utilities in `src/lib/llm`.

### Task 1: Add smoke-test coverage for new route + schema

**Files:**
- Modify: `scripts/smoke-test.mjs`

**Step 1: Write the failing test**
Add checks that:
- `src/app/api/player-reviews/route.ts` exists
- `src/lib/sqlite.ts` contains `player_reviews`

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL with missing file/schema check.

**Step 3: Write minimal implementation**
Create a stub `src/app/api/player-reviews/route.ts` returning `{ ok: false, error: "Not implemented" }` for now.
Add a minimal `CREATE TABLE IF NOT EXISTS player_reviews` in `src/lib/sqlite.ts`.

**Step 4: Run test to verify it passes**
Run: `npm test`
Expected: PASS (Smoke test passed).

**Step 5: Commit**
```bash
git add scripts/smoke-test.mjs src/app/api/player-reviews/route.ts src/lib/sqlite.ts
git commit -m "test: add smoke checks for player reviews"
```

### Task 2: Define review types + length validation helpers

**Files:**
- Modify: `src/types/analysis.ts`
- Create: `src/lib/player-reviews.ts`
- Test: `tests/player-reviews.test.ts`

**Step 1: Write the failing test**
```ts
import { isReviewLengthValid } from "@/lib/player-reviews";

test("review length validation", () => {
  expect(isReviewLengthValid("短".repeat(199))).toBe(false);
  expect(isReviewLengthValid("中".repeat(200))).toBe(true);
  expect(isReviewLengthValid("长".repeat(800))).toBe(true);
  expect(isReviewLengthValid("超".repeat(801))).toBe(false);
});
```

**Step 2: Run test to verify it fails**
Run: `npm run test:unit -- tests/player-reviews.test.ts`
Expected: FAIL with module not found.

**Step 3: Write minimal implementation**
- Add `PlayerReviewCard` type in `src/types/analysis.ts` (reviewer seat/name/role/avatar/content + target seat).
- Create `isReviewLengthValid(content: string)` in `src/lib/player-reviews.ts`.

**Step 4: Run test to verify it passes**
Run: `npm run test:unit -- tests/player-reviews.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/types/analysis.ts src/lib/player-reviews.ts tests/player-reviews.test.ts
git commit -m "feat: add player review types and length validator"
```

### Task 3: Implement player review generation + persistence (server-side)

**Files:**
- Modify: `src/lib/sqlite.ts`
- Modify: `src/lib/player-reviews.ts`

**Step 1: Write the failing test**
Add a unit test for `buildReviewPrompt` (pure function) to ensure it includes target seat and reviewer seat.

**Step 2: Run test to verify it fails**
Run: `npm run test:unit -- tests/player-reviews.test.ts`
Expected: FAIL with missing function.

**Step 3: Write minimal implementation**
Implement in `src/lib/player-reviews.ts`:
- `loadLlmConfigFromDb(db)` → uses `normalizeLlmConfig` + `initLlmConfig`
- `buildReviewPrompt(state, target, reviewer)` → string
- `generateReviewCard` that:
  - uses reviewer `agentProfile.modelRef` via `mergeOptionsFromModelRef`
  - retries reviewer model 2x, then fallback to primary model 1x
  - validates 200–800 chars, else repair once
- `saveReviewCard(db, card)` inserts row

Update `src/lib/sqlite.ts` to add indexes:
- `CREATE UNIQUE INDEX IF NOT EXISTS player_reviews_unique ON player_reviews (game_id, target_seat, reviewer_player_id)`
- `CREATE INDEX IF NOT EXISTS player_reviews_target ON player_reviews (game_id, target_seat)`

**Step 4: Run test to verify it passes**
Run: `npm run test:unit -- tests/player-reviews.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/lib/player-reviews.ts src/lib/sqlite.ts tests/player-reviews.test.ts
git commit -m "feat: add server-side player review generator"
```

### Task 4: Add /api/player-reviews GET/POST

**Files:**
- Modify: `src/app/api/player-reviews/route.ts`

**Step 1: Write the failing test**
Extend smoke-test to assert `GET/POST` handlers are present (simple string check in file).

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL (missing handler strings).

**Step 3: Write minimal implementation**
Implement:
- `GET`: validate `game_id` + `target_seat`, query DB rows, return list.
- `POST`: if existing rows and no `force`, return them; else load `state_json` from `game_history`, generate cards, insert, return list.

**Step 4: Run test to verify it passes**
Run: `npm test`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/app/api/player-reviews/route.ts scripts/smoke-test.mjs
git commit -m "feat: add player reviews API"
```

### Task 5: Generate seat 1 reviews on game completion

**Files:**
- Modify: `src/app/api/game-history/route.ts`

**Step 1: Write the failing test**
Add a smoke-test check that `game-history` complete branch references `player-reviews` generation.

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL.

**Step 3: Write minimal implementation**
Inside `action === "complete"`:
- attempt to generate reviews for `target_seat=1` using `body.state`
- log and continue on error (do not fail completion)

**Step 4: Run test to verify it passes**
Run: `npm test`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/app/api/game-history/route.ts scripts/smoke-test.mjs
git commit -m "feat: generate seat1 reviews on game completion"
```

### Task 6: Frontend avatar tabs + collapsible cards

**Files:**
- Create: `src/components/analysis/PlayerReviewTabs.tsx`
- Modify: `src/components/analysis/PostGameAnalysisPage.tsx`
- Modify: `src/components/analysis/index.ts`

**Step 1: Write the failing test**
Add a lightweight test to ensure the new component renders avatar tabs (optional) or add a smoke-test check for file existence.

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL (missing file).

**Step 3: Write minimal implementation**
- `PlayerReviewTabs`:
  - horizontal avatar list (seat labels)
  - state: selectedSeat (default 1), loading, error, cache
  - fetch `GET /api/player-reviews` first, fallback to `POST` if empty
  - review cards with `展开/收起` (default clamp 6 lines)
  - text classes: `whitespace-pre-wrap break-words leading-relaxed`
- Replace `PlayerReviews` usage in `PostGameAnalysisPage` with `PlayerReviewTabs`.

**Step 4: Run test to verify it passes**
Run: `npm test`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/components/analysis/PlayerReviewTabs.tsx src/components/analysis/PostGameAnalysisPage.tsx src/components/analysis/index.ts scripts/smoke-test.mjs
git commit -m "feat: add avatar tabs and collapsible review cards"
```

