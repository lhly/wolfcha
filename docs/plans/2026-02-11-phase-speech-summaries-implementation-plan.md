# Phase Speech Summaries Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现“按环节×玩家”的发言摘要（PK/遗言即时、其它夜晚批量），与 dailySummary 并存并注入 `<phase_summaries>` 到 LLM 上下文。

**Architecture:** 在 `GameState` 中新增 `phaseSpeechSummaries` 结构；新增环节摘要生成函数（LLM JSON 输出），在 PK/遗言结束时即时生成、夜晚补齐；`buildGameContext` 追加 `<phase_summaries>` 段落。

**Tech Stack:** Next.js + TypeScript，LLM 调用 `generateCompletion`，i18n 通过 `getI18n()`。

---

### Task 1: 添加失败测试（基础结构与提示词注入）

**Files:**
- Modify: `scripts/smoke-test.mjs`

**Step 1: Write the failing test**
在 `scripts/smoke-test.mjs` 末尾追加检查：
```js
check(
  readFile("src/types/game.ts").includes("phaseSpeechSummaries"),
  "GameState should include phaseSpeechSummaries."
);
check(
  readFile("src/lib/prompt-utils.ts").includes("phase_summaries"),
  "prompt-utils should build <phase_summaries> section."
);
```

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL，提示缺少 `phaseSpeechSummaries` 或 `<phase_summaries>`。

**Step 3: Commit**
```bash
git add scripts/smoke-test.mjs
git commit -m "test: add phase summaries smoke checks"
```

---

### Task 2: 实现基础结构与提示词注入（让 Task 1 通过）

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/lib/game-master.ts` (初始化 state)
- Modify: `src/lib/prompt-utils.ts`

**Step 1: Write the failing test**
(已在 Task 1 中完成)

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL（与 Task 1 相同）。

**Step 3: Write minimal implementation**
- 在 `GameState` 增加 `phaseSpeechSummaries` 类型与字段（可内联类型或新增接口）。
- `createInitialGameState()` 初始化 `phaseSpeechSummaries: {}`。
- 在 `prompt-utils.ts` 新增 `buildPhaseSummariesSection(state)`：
  - 遍历 `phaseSpeechSummaries`（按 day、按 seat 拼接）。
  - 输出 `<phase_summaries day=...>` 段落。
- 在 `buildGameContext` 中将该段落插入到 `<history>` 之后、`<announcements>` 之前。

**Step 4: Run test to verify it passes**
Run: `npm test`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/types/game.ts src/lib/game-master.ts src/lib/prompt-utils.ts
git commit -m "feat: add phase summaries structure and prompt section"
```

---

### Task 3: 添加失败测试（摘要生成与流程集成）

**Files:**
- Modify: `scripts/smoke-test.mjs`

**Step 1: Write the failing test**
追加检查：
```js
check(
  readFile("src/lib/game-master.ts").includes("generatePhaseSpeechSummary"),
  "Missing phase speech summary generator."
);
check(
  readFile("src/hooks/useGameLogic.ts").includes("phaseSpeechSummaries"),
  "Missing phase summaries integration in useGameLogic."
);
check(
  readFile("src/i18n/messages/zh.json").includes("phaseSpeechSummary"),
  "Missing phase speech summary i18n keys (zh)."
);
check(
  readFile("src/i18n/messages/en.json").includes("phaseSpeechSummary"),
  "Missing phase speech summary i18n keys (en)."
);
```

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL（缺少 generator / i18n / useGameLogic 集成）。

**Step 3: Commit**
```bash
git add scripts/smoke-test.mjs
git commit -m "test: add phase summaries integration checks"
```

---

### Task 4: 实现摘要生成与流程集成（让 Task 3 通过）

**Files:**
- Modify: `src/lib/game-master.ts`
- Modify: `src/lib/ai-logger.ts`
- Modify: `src/i18n/messages/zh.json`
- Modify: `src/i18n/messages/en.json`
- Modify: `src/hooks/useGameLogic.ts`

**Step 1: Write the failing test**
(已在 Task 3 中完成)

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL.

**Step 3: Write minimal implementation**
- 在 `game-master.ts` 新增 `generatePhaseSpeechSummary(state, options)`：
  - 输入：day、phase、eligibleSeats、messagesBySeat。
  - 组装 transcript（按 seat 分组），调用 `generateCompletion`，JSON 输出 `{"summaries":[{"seat":1,"summary":"..."}]}`。
  - 解析 JSON，补齐 “有资格未发言” 为 `(沉默)`。
  - 记录 aiLogger：新增类型 `phase_summary`（或更细粒度）并加颜色。
- 在 `messages/zh.json` / `messages/en.json` 新增 `phaseSpeechSummary.systemPrompt`、`phaseSpeechSummary.userPrompt`、`phaseSpeechSummary.phaseLabels`（badge/day/pk/lastWords）。
- 在 `useGameLogic`：
  - `onPkSpeechEndRef.current` 里调用 `generatePhaseSpeechSummary` 并写入 `phaseSpeechSummaries[day].phases[DAY_PK_SPEECH]`。
  - 遗言结束回调（`handleVoteComplete` 的 `afterLastWords`）里做同样处理（DAY_LAST_WORDS）。
  - `proceedToNight` 前补齐未生成的 phase（DAY_BADGE_SPEECH / DAY_SPEECH）。

**Step 4: Run test to verify it passes**
Run: `npm test`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/lib/game-master.ts src/lib/ai-logger.ts src/i18n/messages/zh.json src/i18n/messages/en.json src/hooks/useGameLogic.ts
git commit -m "feat: generate and integrate phase speech summaries"
```

---

### Task 5: 最终验证与清理

**Files:**
- (no code changes expected)

**Step 1: Run full tests**
Run: `npm test`
Expected: PASS.

**Step 2: Commit (if needed)**
```bash
git add -A
git commit -m "chore: verify phase speech summaries"
```

---

## Notes / Edge Cases
- `DAY_BADGE_SPEECH` 资格优先用 `badge.candidates`，为空则回退为“存活玩家”。
- `DAY_PK_SPEECH` 使用 `pkTargets`；`DAY_LAST_WORDS` 使用 `currentSpeakerSeat` 或遗言消息回推。
- 保留所有天的 `<phase_summaries>`，必要时压缩早期文本。
- 若 LLM 失败：不阻断流程，仅保留空/沉默条目。

