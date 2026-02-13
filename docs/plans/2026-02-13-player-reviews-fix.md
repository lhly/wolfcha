# Player Reviews 500 & Repeat Fetch Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 解决 `/api/player-reviews` POST 缺参/500 问题，并避免复盘页玩家点评重复请求/刷新。

**Architecture:**
- 服务端新增统一的请求体归一化解析，保证 `game_id/target_seat` 在字符串/数字/JSON 字符串形态下都能正确读取，并提供明确的缺参错误。
- UI 侧避免重复挂载 `PlayerReviewTabs` 或共享一次性请求状态，减少重复 POST/GET。

**Tech Stack:** Next.js 16, TypeScript, node:test (tsx --test)

---

### Task 1: 添加请求体归一化解析的可测试接口

**Files:**
- Modify: `src/lib/player-reviews-request.ts`
- Modify: `tests/player-reviews-request.test.ts`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { normalizeReviewRequestBody, parseReviewRequestBody } from "@/lib/player-reviews-request";

test("parseReviewRequestBody accepts numeric seat and returns ok", () => {
  const result = parseReviewRequestBody({ game_id: "game-1", target_seat: 1 });
  assert.deepEqual(result, { ok: true, value: { gameId: "game-1", targetSeat: 1, force: false } });
});

test("parseReviewRequestBody accepts string seat", () => {
  const result = parseReviewRequestBody({ game_id: "game-1", target_seat: "2", force: true });
  assert.deepEqual(result, { ok: true, value: { gameId: "game-1", targetSeat: 2, force: true } });
});

test("parseReviewRequestBody returns error detail on invalid payload", () => {
  const result = parseReviewRequestBody({});
  assert.deepEqual(result, { ok: false, error: "Missing game_id or target_seat" });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/player-reviews-request.test.ts`
Expected: FAIL (parseReviewRequestBody 未定义)

**Step 3: Write minimal implementation**

```ts
export type ParseResult =
  | { ok: true; value: NormalizedReviewRequest }
  | { ok: false; error: "Missing game_id or target_seat" };

export function parseReviewRequestBody(input: unknown): ParseResult {
  const normalized = normalizeReviewRequestBody(input);
  if (!normalized) return { ok: false, error: "Missing game_id or target_seat" };
  return { ok: true, value: normalized };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/player-reviews-request.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/player-reviews-request.ts tests/player-reviews-request.test.ts
git commit -m "test: add parseReviewRequestBody for player-reviews"
```

---

### Task 2: 路由使用统一解析并回传明确 400

**Files:**
- Modify: `src/app/api/player-reviews/route.ts`

**Step 1: Write the failing test**

```ts
// 同 Task 1：parseReviewRequestBody 失败时返回统一错误
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/player-reviews-request.test.ts`
Expected: FAIL (route 仍未使用统一解析)

**Step 3: Write minimal implementation**

```ts
import { parseReviewRequestBody } from "@/lib/player-reviews-request";

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = parseReviewRequestBody(raw);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    }
    const { gameId, targetSeat, force } = parsed.value;
    // ... existing logic
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/player-reviews-request.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/player-reviews/route.ts
git commit -m "fix: normalize player-reviews POST body"
```

---

### Task 3: 避免 PlayerReviewTabs 双挂载导致的重复请求

**Files:**
- Modify: `src/components/analysis/PostGameAnalysisPage.tsx`
- Create: `src/hooks/useMediaQuery.ts`

**Step 1: Write the failing test**

```ts
// 轻量测试：useMediaQuery 在无 window 时返回 default false
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/use-media-query.test.ts`
Expected: FAIL (hook 未实现)

**Step 3: Write minimal implementation**

```ts
import { useEffect, useState } from "react";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
```

在 `PostGameAnalysisPage` 中根据 `useMediaQuery("(min-width: 1024px)")`
仅渲染一个 `PlayerReviewTabs`。

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/use-media-query.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useMediaQuery.ts src/components/analysis/PostGameAnalysisPage.tsx tests/use-media-query.test.ts
git commit -m "fix: render single PlayerReviewTabs based on media query"
```

---

## Execution Handoff
Plan complete and saved to `docs/plans/2026-02-13-player-reviews-fix.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
