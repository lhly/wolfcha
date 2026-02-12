# 赛后报告按玩家点评设计

## 背景与目标
- 赛后报告为每个玩家展示“所有 LLM 玩家对其的点评”，每条点评 200-800 字（按中文字符数含标点）。
- LLM 玩家目标需包含自评；人类玩家仅他评。
- 1 号座位玩家（固定人类）在游戏结束时立即生成并入库。
- 其它玩家在点击头像时生成并入库。
- 前端头像横向 tab，点击切换玩家；点评卡片支持折叠/展开（默认 6 行），文本自动换行。
- 方案 B：点评生成与入库由服务端完成。

## 数据模型
新增表 `player_reviews`（每条卡片一行）：
- `id` TEXT PRIMARY KEY
- `game_id` TEXT NOT NULL
- `target_player_id` TEXT NOT NULL
- `target_seat` INTEGER NOT NULL
- `reviewer_player_id` TEXT NOT NULL
- `reviewer_seat` INTEGER NOT NULL
- `reviewer_name` TEXT NOT NULL
- `reviewer_role` TEXT NOT NULL
- `reviewer_avatar` TEXT NOT NULL
- `content` TEXT NOT NULL
- `created_at` INTEGER NOT NULL
- `updated_at` INTEGER NOT NULL

约束：
- UNIQUE(`game_id`,`target_seat`,`reviewer_player_id`) 防止重复生成。
- 索引：`game_id,target_seat` 用于查询目标玩家全部卡片。

## 接口设计
`GET /api/player-reviews?game_id=...&target_seat=...`
- 返回指定目标玩家的全部点评卡片。

`POST /api/player-reviews`
- Body: `{ game_id, target_seat, force?: boolean }`
- 若已有卡片且 `force` 非真，则直接返回。
- 否则读取 `game_history.state_json` 生成后入库并返回。

`POST /api/game-history (action=complete)`
- 在完成分支内调用生成函数：优先生成 1 号座位点评并入库。

## 生成流程
1. 读取 `game_history` 获取 `state_json`。
2. 从 `state_json.players[]` 找到目标玩家与所有 LLM 玩家（`!isHuman`）。
3. 逐个点评者生成卡片：
   - 若目标玩家为 LLM，包含自评（点评者=目标玩家）。
4. 使用点评者在本局的 `agentProfile.modelRef` 作为主调用模型。
5. 重试策略：
   - 先用点评者模型重试 N 次（建议 2 次）。
   - 仍失败切换主模型（llm_config.model）重试 1 次。
6. 生成结果校验长度 200-800 字（中文字符数含标点）。
   - 校验失败时重试一次，仍失败则裁剪或补写至达标。
7. 落库并返回。

## Prompt 方向
- 指明点评基于：整局发言、场上行为、目标玩家行为与投票/站队/夜晚行动。
- 输出 JSON 数组，每个元素包含点评者信息与 content。

## 前端交互
- 头像横向 tab（玩家座位号+头像）。
- 默认选中 1 号座位，页面加载即拉取点评。
- 点击其它座位调用 POST 生成（若无）并展示。
- 卡片折叠/展开：默认 line-clamp 6 行，点击切换。
- 文本样式：`whitespace-pre-wrap break-words leading-relaxed`。

## 风险与兜底
- LLM 失败：部分点评缺失时前端提示“部分生成失败，可重试”。
- 历史局缺失 state_json：返回错误并提示无法生成。

