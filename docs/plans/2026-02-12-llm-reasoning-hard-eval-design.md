# LLM 推理上下文 + 硬评估 设计

**目标**
- 为 LLM 玩家补齐“公开盘面”的结构化信息（身份牌配置、票型历史、死亡时间线、存活数）
- 在发言与投票时加入可验证的推理约束
- 通过硬评估与重试机制，避免仅凭“攻击性/语气”做决策

**范围**
- 只暴露公开信息，不暴露任何隐藏身份与夜晚私有行动
- 覆盖白天发言与投票两个阶段

**非目标**
- 不引入外部重排器或第二模型
- 不修改胜负判定与游戏流程
- 不向玩家揭示具体身份或夜晚行动细节

---

## 现状问题简述
- LLM 输入主要是 `gameContext + todayTranscript + selfSpeech`，缺乏结构化“盘面数据”
- 发言/投票提示词没有强制推理结构与证据覆盖
- 投票输出要求“只回座位号”，缺乏理由与验证路径

---

## 方案总览（方案 1 + 硬评估）
1. **结构化上下文**：新增公共盘面区块，明确公开信息的结构化输入
2. **推理约束**：投票/发言输出要求包含证据标签、反证、结论一致性
3. **硬评估**：输出不达标则强制重试（最多 2 次），失败记录日志

---

## 一、结构化上下文（公开盘面）
新增公共盘面区块（建议插入到 `gameContext` 末尾或在 prompt 用户部分独立插入）。

**公共盘面内容（仅公开）**
- **身份牌配置（仅数量）**
  - 示例：`Werewolf: 3, Seer: 1, Witch: 1, Hunter: 1, Guard: 1, Villager: 3`
  - 来源：开局配置 `getRoleConfiguration(totalPlayers)`，在游戏开始时写入 `GameState.publicRoleConfig`
- **存活信息**
  - `alive_count`, `alive_seats`
- **死亡时间线（公开）**
  - 只记录“何天/何环节出局”，不标明“被刀/被毒/被守”等私有细节
  - 公开可识别的：白天放逐、猎人带走
- **票型历史（谁投谁）**
  - 警徽投票与放逐投票都列出“target -> voters”
  - 数据来源优先：`dailySummaryVoteData`
  - 回退：`badge.history` + `voteHistory`

**新增/调整点**
- `GameState` 增加 `publicRoleConfig?: Record<Role, number>`
- 游戏初始化（`useGameLogic` 创建 `newState`）时写入 `publicRoleConfig`
- `prompt-utils` 新增 `buildPublicReasoningContext(state)`
  - 输出 `<public_facts>` 结构化文本块
  - 在 `buildGameContext` 中追加

---

## 二、推理约束（提示词修改）

### 1) 投票 prompt（JSON 输出）
**新输出格式**（示例）
```json
{
  "seat": 3,
  "reason": "票型显示 3 号连续两轮跟随被放逐的好人，同时与其自述不一致",
  "evidence_tags": ["vote_history", "speech_consistency"],
  "counter": "若 3 号只是跟风，仍需看其是否能解释上一轮投票动机",
  "consistency": "与我今日发言一致",
  "confidence": 0.62
}
```

**硬性要求**
- `evidence_tags` 至少 2 类
- 必须包含 `counter`（反证/检验路径）
- 必须包含 `consistency`（与本日发言一致性说明）

**建议 evidence_tags 枚举**
- `vote_history` / `death_timeline` / `role_config` / `public_claims` / `speech_consistency` / `today_transcript`

### 2) 发言 prompt（JSON 输出）
**新输出格式**（示例）
```json
{
  "speech": [
    "我更关注 3 号的票型变化，与其公开立场不一致。",
    "如果只是跟风，至少应解释上一轮投票理由。",
    "我倾向 3 号，但仍保留反证空间。"
  ],
  "rationale": {
    "evidence_tags": ["vote_history", "speech_consistency"],
    "counter": "若 3 号能说明为何改票，需重新评估",
    "consistency": "与我今天发言一致",
    "confidence": 0.58
  }
}
```

**说明**
- 维持现有 `speech` 数组输出格式，兼容流式解析
- `rationale` 用于评估，不展示给用户

---

## 三、硬评估机制

### 1) 评估规则（投票/发言通用）
- JSON 结构完整
- `evidence_tags` ≥ 2
- `counter` 非空且非模板
- `consistency` 非空
- **反“单一攻击性”**：理由中若只出现“攻击性/情绪/态度”类词且无其他证据标签，判失败

### 2) 重试策略
- 失败 → 追加“纠错指令”重新生成
- 最多 2 次重试
- 若仍失败：接受最后一次结果，但记录日志 `eval_failed=true`

### 3) 流式发言处理
- 硬评估要求在输出前完成评估
- **建议：硬评估开启时，白天发言改用非流式生成**
  - 先生成完整 JSON，评估通过后再拆分为 `speech` 段落
  - 代价：发言延迟上升，但保证质量

---

## 关键代码落点（规划）
- `src/types/game.ts`
  - 新增 `publicRoleConfig`
- `src/hooks/useGameLogic.ts`
  - 创建 `newState` 时写入 `publicRoleConfig`
- `src/lib/prompt-utils.ts`
  - 新增 `buildPublicReasoningContext`
  - 在 `buildGameContext` 中追加
- `src/i18n/messages/zh.json`
  - 更新 `prompts.vote.user` 与 `prompts.daySpeech.user`
  - 增加 evidence_tags 枚举说明
- `src/lib/game-master.ts`
  - 新增 `evaluateVoteDecision` / `evaluateSpeechDecision`
  - 在 `generateAIVote` / `generateAISpeechSegmentsStream` 引入评估与重试
  - 硬评估开启时切换非流式发言生成

---

## 风险与缓解
- **风险：延迟增加** → 仅在硬评估开启时关闭流式
- **风险：模型输出不稳定** → 明确 JSON 格式 + 重试 + 兜底日志
- **风险：过度暴露信息** → 只用公开盘面，严格禁止私有夜晚动作

---

## 验证建议
- 单元测试：`buildPublicReasoningContext` 输出格式
- 单元测试：评估函数对合格/不合格样例的判定
- 集成测试：投票输出 JSON 可解析，seat 合法
- 回归测试：发言解析仍能正确显示 `speech` 段落
