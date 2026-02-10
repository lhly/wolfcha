# SQLite 本地持久化 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 使用 SQLite 持久化 LLM 配置、游戏进度、自定义角色、游戏历史，并完成 localStorage 迁移；配置/进度 SSR+API，角色/历史 API-only。

**Architecture:** 后端 API Route 通过 `src/lib/sqlite.ts` 访问本地 `data/wolfcha.db`。`page.tsx` 拆分为 Server + Client，服务端读取 LLM 配置与游戏进度作为初始 props，客户端负责其余数据拉取与迁移。

**Tech Stack:** Next.js App Router (Node runtime API), better-sqlite3, Jotai, TypeScript

---

### Task 1: 修复 getProviderForModel 悬空引用

**Files:**
- Modify: `scripts/smoke-test.mjs`
- Modify: `src/lib/llm.ts`

**Step 1: Write failing test**

```js
// scripts/smoke-test.mjs
if (exists("src/lib/llm.ts")) {
  const llmFile = readFile("src/lib/llm.ts");
  check(!llmFile.includes("getProviderForModel("), "llm.ts should not reference getProviderForModel.");
}
```

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL with "llm.ts should not reference getProviderForModel."

**Step 3: Minimal implementation**
Remove the guard in `generateJSON`:

```ts
// src/lib/llm.ts
const result = await generateCompletion({
  ...options,
  messages: messagesWithFormat,
});
```

**Step 4: Run test to verify it passes**
Run: `npm test`
Expected: PASS

**Step 5: Commit**
```bash
git add scripts/smoke-test.mjs src/lib/llm.ts
git commit -m "fix: remove getProviderForModel reference"
```

---

### Task 2: SQLite 基础设施与 Schema

**Files:**
- Modify: `package.json` (add `better-sqlite3`)
- Modify: `.gitignore` (ignore `data/*.db`)
- Create: `src/lib/sqlite.ts`
- Create: `data/.gitkeep`
- Modify: `scripts/smoke-test.mjs`

**Step 1: Write failing test**

```js
// scripts/smoke-test.mjs
check(exists("src/lib/sqlite.ts"), "Missing sqlite helper.");
```

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL "Missing sqlite helper."

**Step 3: Minimal implementation**

```ts
// src/lib/sqlite.ts
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = path.join(process.cwd(), "data", "wolfcha.db");
let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    ensureSchema(db);
  }
  return db;
}

function ensureSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS llm_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      base_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      model TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS game_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL,
      state_json TEXT NOT NULL,
      saved_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS custom_characters (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      gender TEXT NOT NULL,
      age INTEGER NOT NULL,
      mbti TEXT NOT NULL,
      basic_info TEXT,
      style_label TEXT,
      avatar_seed TEXT,
      is_deleted INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS game_history (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      started_at INTEGER,
      ended_at INTEGER,
      winner TEXT,
      summary_json TEXT,
      state_json TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meta_kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
```

**Step 4: Run test to verify it passes**
Run: `npm test`
Expected: PASS

**Step 5: Commit**
```bash
git add package.json .gitignore src/lib/sqlite.ts data/.gitkeep scripts/smoke-test.mjs
git commit -m "feat: add sqlite helper and schema"
```

---

### Task 3: 新增本地持久化 API

**Files:**
- Create: `src/app/api/local-config/route.ts`
- Create: `src/app/api/game-state/route.ts`
- Create: `src/app/api/custom-characters/route.ts`
- Create: `src/app/api/game-history/route.ts`
- Create: `src/app/api/meta/route.ts`
- Modify: `scripts/smoke-test.mjs`

**Step 1: Write failing test**

```js
// scripts/smoke-test.mjs
const apiFiles = [
  "src/app/api/local-config/route.ts",
  "src/app/api/game-state/route.ts",
  "src/app/api/custom-characters/route.ts",
  "src/app/api/game-history/route.ts",
  "src/app/api/meta/route.ts",
];
for (const f of apiFiles) check(exists(f), `Missing API route: ${f}`);
```

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL missing routes

**Step 3: Minimal implementation**
Each route uses Node runtime and `getDb()`.
Example (`local-config`):

```ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/sqlite";

export async function GET() {
  const db = getDb();
  const row = db.prepare("SELECT * FROM llm_config WHERE id=1").get();
  return NextResponse.json({ ok: true, data: row ?? null });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const db = getDb();
  db.prepare("INSERT INTO llm_config (id, base_url, api_key, model, updated_at) VALUES (1, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET base_url=excluded.base_url, api_key=excluded.api_key, model=excluded.model, updated_at=excluded.updated_at")
    .run(body.base_url, body.api_key, body.model, Date.now());
  return NextResponse.json({ ok: true });
}
```

**Step 4: Run test to verify it passes**
Run: `npm test`
Expected: PASS

**Step 5: Commit**
```bash
git add src/app/api/*/route.ts scripts/smoke-test.mjs
git commit -m "feat: add sqlite-backed local data APIs"
```

---

### Task 4: SSR 注入 + LLM 配置存取

**Files:**
- Modify: `src/app/page.tsx` (server)
- Create: `src/app/HomeClient.tsx` (client)
- Create: `src/lib/llm-config.ts`
- Modify: `src/components/game/LocalModelSettingsModal.tsx`
- Modify: `src/components/game/WelcomeScreen.tsx`
- Modify: `src/lib/llm.ts`
- Modify: `scripts/smoke-test.mjs`

**Step 1: Write failing test**

```js
// scripts/smoke-test.mjs
check(!readFile("src/app/page.tsx").includes("use client"), "page.tsx should be server component.");
check(exists("src/app/HomeClient.tsx"), "Missing HomeClient.tsx.");
```

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL

**Step 3: Minimal implementation**
- `page.tsx` 变为 server，读取 sqlite 并传入 `HomeClient`：

```tsx
// src/app/page.tsx (server)
import HomeClient from "./HomeClient";
import { getDb } from "@/lib/sqlite";

export default function Page() {
  const db = getDb();
  const llm = db.prepare("SELECT * FROM llm_config WHERE id=1").get();
  const game = db.prepare("SELECT * FROM game_state WHERE id=1").get();
  return <HomeClient initialLlm={llm ?? null} initialGame={game ?? null} />;
}
```

- `HomeClient.tsx`：将原 `page.tsx` 内容迁入，保留 `"use client"`。
- `llm-config.ts`：提供 `initLlmConfig`、`getLlmConfig`、`setLlmConfig`，内部缓存 + API 写入。
- `LocalModelSettingsModal` 使用 `llm-config` 读取/保存并调用 `/api/local-config`。
- `WelcomeScreen` 用 `llmConfig` 显示模型名，避免 localStorage 直读。
- `llm.ts` 改为读取 `getLlmConfig()`。

**Step 4: Run test to verify it passes**
Run: `npm test`
Expected: PASS

**Step 5: Commit**
```bash
git add src/app/page.tsx src/app/HomeClient.tsx src/lib/llm-config.ts src/components/game/LocalModelSettingsModal.tsx src/components/game/WelcomeScreen.tsx src/lib/llm.ts scripts/smoke-test.mjs
git commit -m "feat: seed llm config via sqlite and SSR"
```

---

### Task 5: 游戏进度持久化（SQLite）

**Files:**
- Modify: `src/store/game-machine.ts`
- Create: `src/lib/game-state-storage.ts`
- Modify: `src/app/HomeClient.tsx`

**Step 1: Write failing test**

```js
// scripts/smoke-test.mjs
check(readFile("src/store/game-machine.ts").includes("game-state-storage"), "game-machine should use sqlite storage helper.");
```

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL

**Step 3: Minimal implementation**
- `game-state-storage.ts`：封装 GET/PUT/DELETE `/api/game-state`。
- `game-machine.ts`：
  - 移除 localStorage 写入，改为异步保存（fire-and-forget）。
  - `clearPersistedGameState` 调用 DELETE API。
- `HomeClient.tsx`：使用 `useHydrateAtoms` 注入 `initialGame`。

**Step 4: Run test to verify it passes**
Run: `npm test`
Expected: PASS

**Step 5: Commit**
```bash
git add src/store/game-machine.ts src/lib/game-state-storage.ts src/app/HomeClient.tsx scripts/smoke-test.mjs
git commit -m "feat: persist game state in sqlite"
```

---

### Task 6: 自定义角色与游戏历史 API-only

**Files:**
- Modify: `src/hooks/useCustomCharacters.ts`
- Modify: `src/hooks/useGameLogic.ts` (endGame hook)
- Create: `src/lib/game-history.ts`

**Step 1: Write failing test**

```js
// scripts/smoke-test.mjs
check(readFile("src/hooks/useCustomCharacters.ts").includes("/api/custom-characters"), "custom characters should use API");
```

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL

**Step 3: Minimal implementation**
- `useCustomCharacters` 改为 fetch API CRUD。
- `useGameLogic` 在 `endGameSafely` 后调用 `saveGameHistory` 写入 `/api/game-history`。

**Step 4: Run test to verify it passes**
Run: `npm test`
Expected: PASS

**Step 5: Commit**
```bash
git add src/hooks/useCustomCharacters.ts src/hooks/useGameLogic.ts src/lib/game-history.ts scripts/smoke-test.mjs
git commit -m "feat: persist custom characters and game history"
```

---

### Task 7: localStorage 迁移

**Files:**
- Create: `src/hooks/useLocalStorageMigration.ts`
- Modify: `src/app/HomeClient.tsx`
- Modify: `scripts/smoke-test.mjs`

**Step 1: Write failing test**

```js
check(exists("src/hooks/useLocalStorageMigration.ts"), "Missing local storage migration hook");
```

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL

**Step 3: Minimal implementation**
- Hook 读取 localStorage（`wolfcha_llm_*`, `wolfcha.game_state`, `wolfcha_custom_characters`）并 POST 到 API。
- 迁移成功后写 `meta_kv` 标记，并可选择清理 localStorage。

**Step 4: Run test to verify it passes**
Run: `npm test`
Expected: PASS

**Step 5: Commit**
```bash
git add src/hooks/useLocalStorageMigration.ts src/app/HomeClient.tsx scripts/smoke-test.mjs
git commit -m "feat: migrate localStorage data to sqlite"
```

---

### Task 8: 验证与文档

**Files:**
- Modify: `README.md` / `README.zh.md`（SQLite 说明）

**Steps:**
1. 运行 `npm test`
2. 手动验证：配置 LLM → 刷新 → 仍保留；启动游戏 → 刷新 → 恢复进度；自定义角色与历史可读
3. 更新 README（说明 `data/wolfcha.db`）

**Commit:**
```bash
git add README.md README.zh.md
git commit -m "docs: document sqlite local storage"
```
