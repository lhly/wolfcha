# 按环节×玩家发言摘要注入 LLM 上下文（设计）

日期：2026-02-11

## 目标
- 基于“当天实际出现的发言环节”，为**每位有资格发言的玩家**生成 1–2 句摘要。
- 有资格但未发言的玩家标注“（沉默）”；无资格则不出现在该环节。
- 与现有 `dailySummary` **并存**，作为更细粒度上下文注入 LLM。
- 采用混合生成策略：**PK/遗言即时**，其它环节在夜晚批量补全。

## 非目标
- 不替换现有 `dailySummary`（仍保留全局摘要）。
- 不改变游戏规则、发言流程与 UI。

## 关键决策
- **动态环节**：仅总结当天真实出现的 phase。
- **资格判定（规则优先）**：竞选=候选人、PK=pkTargets、遗言=出局者、白天讨论=存活玩家。
- **混合生成**：PK/遗言即时生成，其他环节夜晚补全。
- **保留所有天**：`<phase_summaries>` 不裁剪天数（必要时压缩早期文本）。

## 数据结构
新增 `GameState.phaseSpeechSummaries`：

```ts
phaseSpeechSummaries?: {
  [day: number]: {
    order: string[]; // 当天实际出现的 phase 顺序
    phases: {
      [phase: string]: {
        eligibleSeats: number[];
        summaries: {
          [seat: number]: { text: string; silent?: boolean }
        }
      }
    }
  }
}
```

说明：
- `order` 仅记录当日出现过的 phase。
- `summaries` 仅包含“有资格”的玩家；未发言者 `silent=true` 且 `text="（沉默）"`。

## 资格判定规则
- **DAY_BADGE_SPEECH**：`state.badge.candidates`；若为空但 phase 出现，则回退为“全部存活”。
- **DAY_PK_SPEECH**：`state.pkTargets`。
- **DAY_LAST_WORDS**：出局者（优先使用该 phase 的 `currentSpeakerSeat`；恢复场景可从遗言消息回推）。
- **DAY_SPEECH**：全部存活玩家。

## 摘要生成流程（混合方案）

### 1) 单环节摘要函数
输入：`phase`、该 phase 下的消息（按 seat 分组）、`eligibleSeats`。\
输出：`{ summaries: [{ seat, summary }] }`。
- LLM 仅输出**有发言**玩家摘要。
- 代码补齐“有资格未发言”的 `(沉默)`。

### 2) 即时生成（PK / 遗言）
- PK 结束后立即生成并写入 `phaseSpeechSummaries[day]`。
- 遗言结束后立即生成并写入。

### 3) 夜晚批量补全
- 夜晚开始前扫描当日出现的 phase，补齐尚未生成的环节摘要。
- 与 `dailySummary` 同步入 state，用于后续上下文。

## LLM 提示词建议（单环节）
**System（示意）**：
- 你是发言摘要员，只总结该环节。
- 每位玩家 1–2 句，保留座位号。
- 不要虚构未出现的玩家。

**User（示意）**：
```
【第{day}天】【环节：{phaseLabel}】发言记录
{按座位分组的发言文本}

请输出 JSON：
{ "summaries": [ {"seat": 3, "summary": "..."} ] }
```

## 提示词注入
新增 `buildPhaseSummariesSection`：

```
<phase_summaries day=1>
1号：[竞选] ... [白天] ... [遗言] ...
2号：[白天] ...
</phase_summaries>
```

拼接到 `buildGameContext` 中，放在 `<history>` 后、`<announcements>` 前。

## 长度控制
- 每人每环节 1–2 句。
- 若上下文接近上限，可对**早期天**压缩为更短句式，但仍保留所有天。

## 错误与降级
- LLM 失败：该环节保持空或仅填 `silent` 标记，不阻断流程。
- 缺失资格数据时使用合理回退（见资格判定规则）。

## 集成点（建议）
- `src/types/game.ts`：新增字段。
- `src/lib/game-master.ts`：新增摘要生成函数。
- `src/hooks/useGameLogic.ts`：PK/遗言即时生成 + 夜晚批量补全。
- `src/lib/prompt-utils.ts`：新增 `<phase_summaries>` 生成与注入。

## 验收点
- 当天有 PK/遗言时，后续 LLM 上下文可见对应摘要。
- 无 PK/遗言时不生成对应 phase。
- 有资格未发言标注“（沉默）”。
- `<phase_summaries>` 保留所有天。
