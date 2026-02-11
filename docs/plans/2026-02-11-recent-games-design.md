# 最近30局记录与继续游玩设计

日期：2026-02-11

## 目标
- 记录最近 30 局对局，主页面提供入口查看列表。
- 列表显示每局状态（进行中/已完成）与最后更新时间。
- 点击进行中的对局，可从玩家退出时的轮次继续。
- 支持多局“进行中”（包含暂停态），但多端同时游玩仅允许**最新一局**为活跃局。
- 无账号体系，通过 **TOTP 动态口令**进行单用户访问门禁。

## 非目标
- 不引入多用户账号系统。
- 不做多服务端数据同步/分片。
- 不提供复杂的多人并发协作编辑。

## 现状梳理
- 已有服务端 SQLite（`src/lib/sqlite.ts`），数据位于 `data/wolfcha.db`。
- `game_state` 表用于保存单一进行中状态，`/api/game-state` 可读写。
- `game_history` 表用于保存完成对局，当前仅在 `endGame` 后写入。
- 客户端恢复逻辑：`HomeClient` 读取 `game_state` 注入 Jotai；`useGameLogic` 在恢复后根据 phase 继续流程。

## 方案总览（选择 A）
在 **`game_history` 表扩展字段**，复用现有 API 体系完成：
- `status`: `in_progress | paused | completed`
- `updated_at`: 最后一次保存或完成时间
- `last_checkpoint_state_json`: 最近检查点的游戏状态快照

**活跃局规则**：任一时刻仅允许一局 `in_progress`，其它进行中局统一标记为 `paused`；列表仍显示为“进行中”。

## 数据模型调整
```
ALTER TABLE game_history ADD COLUMN status TEXT;
ALTER TABLE game_history ADD COLUMN updated_at INTEGER;
ALTER TABLE game_history ADD COLUMN last_checkpoint_state_json TEXT;
```
迁移策略：启动时检查列缺失并补齐（`PRAGMA table_info` + `ALTER TABLE`）。

## API 设计
### 1) GET /api/game-history?limit=30
返回最近 30 局元数据（不含大体积 state），用于列表展示。

### 2) GET /api/game-history?id=<gameId>
返回指定局详情，包含 `last_checkpoint_state_json` 供继续。

### 3) POST /api/game-history
使用 action 语义：
- `action: start`：创建新局（status=in_progress），并将其他 in_progress 设为 paused。
- `action: checkpoint`：更新当前局 `last_checkpoint_state_json` + `updated_at`。
- `action: pause`：将当前局设为 paused。
- `action: resume`：将指定局设为 in_progress，并将其他 in_progress 设为 paused，返回 checkpoint。
- `action: complete`：结束对局（status=completed），写入 `winner/summary/state_json`。

## 客户端流程
### 1) 开局
- 在 `startGame` 成功创建初始 GameState 后调用 `action=start`。

### 2) 检查点保存
- 在 `saveGameState`（已触发 /api/game-state）后，同步调用 `action=checkpoint` 更新历史记录。

### 3) 退出/切换
- 点击“退出”时调用 `action=pause`（若当前为进行中局）。

### 4) 继续对局
- 列表点击“继续” -> `action=resume` 获取 checkpoint。
- 客户端写入 `/api/game-state`（覆盖当前活跃局状态），再 `window.location.reload()`，复用现有恢复逻辑。

## UI 入口与列表
- 主页面 topbar 右侧新增“最近对局”按钮（桌面端带文案，移动端仅图标）。
- 弹窗 `RecentGamesModal` 展示列表：
  - 游戏编号/开始时间
  - 当前天数（从 state 解析）
  - 状态标签（进行中/已完成）
  - 最后更新时间
  - 进行中局显示“继续”按钮
- 若当前局为活跃局，显示“当前进行中”徽标。

## TOTP 门禁
- 服务端新增 `TOTP_SECRET` 环境变量。
- 新增 `POST /api/auth/totp` 校验动态码，成功后写入短时 cookie（如 24h）。
- 中间件检查 cookie；未通过时重定向到门禁页/弹窗。
- 可选：首次绑定二维码（只展示一次）。

## 风险与边界
- 多端同时游玩：最新 resume/start 自动暂停旧的 active。
- checkpoint 频率高：沿用现有 throttle，避免频繁写 DB。
- 切换对局需 reload：简单可靠，避免复杂的运行时状态迁移。

