# 多模型随机候选（Option C）设计

**目标**：为游戏增加多模型随机机制，用户在顶部菜单配置候选模型（标签输入），保存时优先校验 `/models`，失败则降级，运行时遇到无效模型自动剔除并重抽。

## 交互设计
- 模型候选使用**标签输入**：输入回车生成标签、点击 X 删除；支持逗号/空格拆分批量粘贴。
- 保存时执行校验并提示：剔除不可用模型或提示已降级为运行时校验。

## 数据结构与存储
- LlmConfig 增加 `models: string[]`，保持旧 `model` 兼容（旧值迁移为单元素数组）。
- SQLite `llm_config` 增加 `models_json`（或等价字段）存储候选数组，`model` 继续保存首选模型用于兼容。

## 校验与容错
1) **保存时校验**（优先）：尝试 `GET /models`。
   - 成功：候选池 = 用户标签 ∩ /models 列表，提示剔除项。
   - 失败：记录不支持，提示降级。
2) **运行时兜底**：调用失败（model not found/invalid）则从池中剔除并重抽；若池空则回退默认模型。

## 随机池分配
- 每局固定随机池；每个 AI 独立从池中分配 `modelRef`。
- `game-master` 已支持 per-player modelRef，无需改动调用链。

## 影响范围
- 前端：LocalModelSettingsModal、llm-config、api-keys
- 后端：/api/local-config、sqlite schema
- 核心逻辑：sampleModelRefs、随机分配
