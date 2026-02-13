# Postgame Report Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 持久化完整赛后报告（含玩家+系统完整发言），并让玩家点评优先使用该报告作为权威事实源，避免胜负/身份错误。

**Architecture:** 新增 `game_analysis` 表与读写 API；在分析生成后保存报告、在复盘页缺失时自动回填；`/api/player-reviews` 生成点评时优先读取报告（时间线/投票/胜负/身份/完整发言），再结合 `GameState` 的角色与模型信息生成点评。

**Tech Stack:** Next.js App Router, TypeScript, better-sqlite3, node:test (tsx --test).

---

### Task 1: 定义报告类型 + 请求体解析

**Files:**
- Modify: `src/types/analysis.ts`
- Create: `src/lib/game-analysis-request.ts`
- Test: `tests/game-analysis-request.test.ts`

**Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { parseGameAnalysisRequestBody } from "@/lib/game-analysis-request";

test("parseGameAnalysisRequestBody accepts object payload", () => {
  const parsed = parseGameAnalysisRequestBody({ game_id: "game-1", report: { gameId: "game-1" } });
  assert.equal(parsed.ok, true);
});

test("parseGameAnalysisRequestBody accepts JSON string payload", () => {
  const parsed = parseGameAnalysisRequestBody(JSON.stringify({ game_id: "game-1", report: { gameId: "game-1" } }));
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
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/game-analysis-request.test.ts`
Expected: FAIL with "parseGameAnalysisRequestBody is not a function"

**Step 3: Write minimal implementation**

```ts
// src/lib/game-analysis-request.ts
export type ParseGameAnalysisRequestResult =
  | { ok: true; value: { gameId: string; report: Record<string, unknown> } }
  | { ok: false; error: string };

export function parseGameAnalysisRequestBody(input: unknown): ParseGameAnalysisRequestResult {
  // coerce to object, validate game_id, report is object
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/game-analysis-request.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/analysis.ts src/lib/game-analysis-request.ts tests/game-analysis-request.test.ts
git commit -m "feat: add game analysis request parser and report type"
```

---

### Task 2: 新增 game_analysis 表 + API 路由

**Files:**
- Modify: `src/lib/sqlite.ts`
- Create: `src/lib/game-analysis-store.ts`
- Create: `src/app/api/game-analysis/route.ts`

**Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { upsertGameAnalysisReport, fetchGameAnalysisReport } from "@/lib/game-analysis-store";
import Database from "better-sqlite3";

// simple in-memory db test
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/game-analysis-store.test.ts`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

```ts
// src/lib/sqlite.ts: CREATE TABLE IF NOT EXISTS game_analysis (...)
// src/lib/game-analysis-store.ts: upsert + fetch (JSON.parse)
// src/app/api/game-analysis/route.ts: GET/POST with parseGameAnalysisRequestBody
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/game-analysis-store.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/sqlite.ts src/lib/game-analysis-store.ts src/app/api/game-analysis/route.ts tests/game-analysis-store.test.ts
git commit -m "feat: add game analysis storage and api"
```

---

### Task 3: 客户端 API + 报告构建器

**Files:**
- Create: `src/lib/game-analysis-api.ts`
- Test: `tests/game-analysis-report.test.ts`

**Step 1: Write the failing test**

```ts
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
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/game-analysis-report.test.ts`
Expected: FAIL with "buildGameAnalysisReport is not a function"

**Step 3: Write minimal implementation**

```ts
export function buildGameAnalysisReport(data: GameAnalysisData, messages: ChatMessage[]): GameAnalysisReport {
  return { ...data, messages };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/game-analysis-report.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/game-analysis-api.ts tests/game-analysis-report.test.ts
git commit -m "feat: add game analysis api helpers"
```

---

### Task 4: 生成后持久化报告

**Files:**
- Modify: `src/hooks/useGameAnalysis.ts`

**Step 1: Write the failing test**

```ts
// optional: keep as manual verification
```

**Step 2: Implement minimal changes**

```ts
const report = buildGameAnalysisReport(data, gameState.messages);
void saveGameAnalysisReport(report);
```

**Step 3: Verify manually**

Run: `pnpm test:unit -- tests/game-analysis-report.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/hooks/useGameAnalysis.ts
git commit -m "feat: persist game analysis after generation"
```

---

### Task 5: 复盘页回填历史报告

**Files:**
- Create: `src/hooks/useGameAnalysisReport.ts`
- Modify: `src/app/[slug]/analysis/page.tsx`
- Modify: `src/lib/game-history.ts`

**Step 1: Write the failing test**

```ts
// optional: helper-only test if extracting pure function
```

**Step 2: Implement minimal changes**

- `useGameAnalysisReport(gameId)`:
  - GET `/api/game-analysis?game_id=...`
  - 如果无结果：GET `/api/game-history?id=...` → 用 `state_json` 生成报告 → POST 保存
- `[slug]/analysis/page.tsx` 使用 `useParams()` 获取 gameId，改用新 hook 返回的 `analysisData`。

**Step 3: Manual verification**

- 打开 `/analysis/<gameId>`
- 首次加载自动回填并持久化

**Step 4: Commit**

```bash
git add src/hooks/useGameAnalysisReport.ts src/app/[slug]/analysis/page.tsx src/lib/game-history.ts
git commit -m "feat: backfill game analysis report on history view"
```

---

### Task 6: 点评优先使用报告上下文

**Files:**
- Modify: `src/lib/player-reviews.ts`
- Modify: `src/app/api/player-reviews/route.ts`
- Test: `tests/player-reviews.test.ts`

**Step 1: Write the failing test**

```ts
// tests/player-reviews.test.ts
const report = { gameId: "g1", result: "wolf_win", messages: [{ content: "系统" }] } as any;
const prompt = buildReviewPrompt(state, target, reviewer, report);
assert.ok(prompt.includes("狼人阵营获胜"));
assert.ok(prompt.includes("系统"));
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/player-reviews.test.ts`
Expected: FAIL

**Step 3: Implement minimal changes**

- `buildReviewPrompt` 支持可选 `report`：
  - 胜负/时间线/全体发言来自 report
  - 明确输出 `【目标身份】` / `【点评者身份】`
- `/api/player-reviews` 优先读取 `game_analysis` 报告并传入

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/player-reviews.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/player-reviews.ts src/app/api/player-reviews/route.ts tests/player-reviews.test.ts
git commit -m "feat: use game analysis report in review prompts"
```

---

### Task 7: 回归验证

**Step 1: Run focused tests**

Run: `pnpm test:unit -- tests/game-analysis-request.test.ts tests/game-analysis-store.test.ts tests/game-analysis-report.test.ts tests/player-reviews.test.ts`
Expected: PASS

**Step 2: Manual check**

- 打开历史复盘页面，确认自动回填
- 生成点评，确认胜负与身份一致

---

## Notes
- 报告包含完整 `messages`（玩家+系统），用于点评上下文
- 仍保留 `GameState` 用于点评模型选择（agentProfile）
