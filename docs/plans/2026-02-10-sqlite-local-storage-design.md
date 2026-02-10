# SQLite 本地持久化设计（混合 SSR+API）

**目标**：将 LLM 配置、游戏进度、自定义角色、游戏历史持久化到 SQLite，并完成 localStorage 迁移；配置/进度支持 SSR 注入以避免 hydration 不一致。

## 方案概览
- **混合模式**：
  - LLM 配置 + 游戏进度：SSR+API（首屏一致、减少 hydration 警告）。
  - 自定义角色 + 游戏历史：API-only（客户端加载后拉取，降低改造成本）。
- **单用户场景**：SQLite 文件存放于 `data/wolfcha.db`，API Route 使用 Node runtime 访问。

## 数据模型
- `llm_config`（单行）：`id=1, base_url, api_key, model, updated_at`
- `game_state`（单行）：`id=1, version, state_json, saved_at`
- `custom_characters`：角色记录（字段对齐 `CustomCharacter`）
- `game_history`：对局记录（`game_id, started_at, ended_at, winner, summary_json, state_json, created_at`）
- `meta_kv`：迁移标记（如 `local_storage_migrated=true`）

## API 设计
- `GET/PUT /api/local-config`：读写 LLM 配置
- `GET/PUT/DELETE /api/game-state`：读写当前进度
- `GET/POST/PUT/DELETE /api/custom-characters`：角色 CRUD
- `GET/POST /api/game-history`：历史记录

## SSR 注入
- 将 `src/app/page.tsx` 拆分为 Server + Client 结构：
  - Server 端读取 `llm_config` 与 `game_state`，作为 props 传给 `HomeClient`。
  - Client 端初始状态使用 SSR props，避免 `Not set` / `deepseek` 文本不一致。

## 迁移策略
- 客户端启动时调用 `/api/meta` 或 `/api/local-config` 判断是否已迁移。
- 若 SQLite 为空且 localStorage 有数据：
  - 迁移 `wolfcha_llm_*`、`wolfcha.game_state`、`wolfcha_custom_characters` 到 SQLite。
  - 设置 `meta_kv.local_storage_migrated=true`。
- 迁移完成后以 SQLite 为准，可选择清理 localStorage。

## 错误处理与安全
- API Key 默认明文存 SQLite（单机环境），可后续加密。
- 统一返回 `{ ok, data, error }`，前端显示 toast。

## 测试策略
- 新增 smoke test 检查 SQLite API 路由存在与基本响应。
- 迁移流程使用脚本或测试用例验证：空 DB → 迁移 → DB 有数据。
