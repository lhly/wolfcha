# Fix DaySpeech ICU Message Error Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复 DaySpeech 提示词在 next-intl 解析时触发 INVALID_MESSAGE/MALFORMED_ARGUMENT，保证 t("prompts.daySpeech.user") 正常渲染。

**Architecture:** 使用 next-intl 的 ICU MessageFormat。问题来自 JSON 示例中的字面量花括号未转义，修复方式是在消息字符串中转义 "{"/"}"，保留变量占位符。

**Tech Stack:** Next.js 16, next-intl, TypeScript, tsx --test (node:test)

### Task 1: 添加失败用例（复现问题）

**Files:**
- Create: `tests/i18n-prompts.test.ts`

**Step 1: Write the failing test**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getI18n } from "@/i18n/translator";

test("daySpeech user prompt renders without ICU errors (zh/en)", () => {
  const zh = getI18n("zh").t("prompts.daySpeech.user", {
    gameContext: "GC",
    todayTranscript: "TT",
    selfSpeech: "SS",
    phaseHintSection: "",
    speakOrderHint: "SO",
  });
  const en = getI18n("en").t("prompts.daySpeech.user", {
    gameContext: "GC",
    todayTranscript: "TT",
    selfSpeech: "SS",
    phaseHintSection: "",
    speakOrderHint: "SO",
  });

  assert.notEqual(zh, "prompts.daySpeech.user");
  assert.notEqual(en, "prompts.daySpeech.user");
  assert.match(zh, /GC/);
  assert.match(en, /GC/);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit tests/i18n-prompts.test.ts`
Expected: FAIL（当前返回 key 或触发 INVALID_MESSAGE）

### Task 2: 转义 JSON 示例花括号

**Files:**
- Modify: `src/i18n/messages/zh.json`
- Modify: `src/i18n/messages/en.json`

**Step 1: Update zh.json**

在 `prompts.daySpeech.user` 的 JSON 示例中把字面量 `{` / `}` 转义为 `'{` / `}'`。

**Step 2: Update en.json**

同样转义 `prompts.daySpeech.user` 中的 JSON 示例花括号。

### Task 3: 验证修复

**Files:**
- Test: `tests/i18n-prompts.test.ts`

**Step 1: Run unit test**

Run: `pnpm test:unit tests/i18n-prompts.test.ts`
Expected: PASS

**Step 2: (Optional) Run full unit suite**

Run: `pnpm test:unit`
Expected: PASS

### Task 4: 提交变更

**Step 1: Commit**

```bash
git add tests/i18n-prompts.test.ts src/i18n/messages/zh.json src/i18n/messages/en.json
git commit -m "fix: escape ICU braces in day speech prompt"
```
