# 赛后报告持久化设计

**目标**
- 持久化完整赛后报告（`GameAnalysisData` + 完整发言），支持随时查看历史对局复盘。
- 复盘点评优先以报告为“权威事实源”，杜绝胜负/身份错误，同时保留完整发言标准。

**非目标**
- 不调整胜利条件（仍沿用当前规则）。

---

## 数据模型
新增表 `game_analysis`：
- `game_id` TEXT PRIMARY KEY
- `report_json` TEXT NOT NULL（完整赛后报告 JSON）
- `created_at` INTEGER NOT NULL
- `updated_at` INTEGER NOT NULL

报告结构：
- 基于 `GameAnalysisData`，额外包含 `messages`（完整发言，含玩家与系统消息）。
- 这样报告自包含，不依赖 `state_json` 即可重建点评上下文。

---

## API 设计
新增 `app/api/game-analysis/route.ts`：
- `GET /api/game-analysis?game_id=...` → 取完整报告（无则返回 null）
- `POST /api/game-analysis` → upsert 保存 `{ game_id, report }`（覆盖最新）

校验策略（最小）：
- `game_id` 必填
- `report` 为对象即可（避免硬依赖模型输出结构）

---

## 生成与回填流程
1) **实时生成**：`useGameAnalysis` 生成报告成功后，立即 `POST /api/game-analysis` 持久化。
2) **历史回填**：复盘页打开时优先 `GET /api/game-analysis`：
   - 有报告：直接展示
   - 无报告：从 `game_history` 拉 `state_json`，在客户端生成报告后回写（首次回填）。

---

## 点评生成改造
`/api/player-reviews` 生成点评时优先读取 `game_analysis.report_json`：
- **权威事实**：胜利方、真实身份/阵营、时间线事件、投票信息
- **完整发言**：来自报告 `messages`

若报告缺失：
- 走回填逻辑（优先回填报告，再生成点评）
- 保底使用 `state_json` 生成（避免阻塞）

---

## 兼容性与迁移
- 对新局：自动持久化
- 对历史局：首次打开复盘页触发回填
- 不破坏现有 UI 与分享链接（`/analysis/:game_id`）

---

## 测试要点
- 新表建表与 upsert 路由
- `useGameAnalysis` 自动持久化
- 复盘页历史回填逻辑
- `player-reviews` 优先使用报告内容
