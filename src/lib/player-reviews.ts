import type Database from "better-sqlite3";
import type { GameState, Player, ModelRef } from "@/types/game";
import type { PlayerReviewCard } from "@/types/analysis";
import { generateJSON, mergeOptionsFromModelRef } from "@/lib/llm";
import { getReviewModel } from "@/lib/api-keys";
import { initLlmConfig, normalizeLlmConfig } from "@/lib/llm-config";

export function getTextLength(value: string): number {
  return Array.from(value ?? "").length;
}

export function isReviewLengthValid(content: string): boolean {
  const length = getTextLength(content);
  return length >= 200 && length <= 800;
}

export function coerceReviewLength(content: string): string {
  if (!content) return "";
  const length = getTextLength(content);
  if (length > 800) {
    return Array.from(content).slice(0, 800).join("");
  }
  if (length < 200) {
    let out = content;
    while (getTextLength(out) < 200) {
      out += "。补充说明";
    }
    return out;
  }
  return content;
}

export type ReviewPlanItem = {
  reviewer: Player;
  reviewerSeat: number;
  prompt: string;
};

export function buildReviewPlan(state: GameState, targetSeat: number): ReviewPlanItem[] {
  const target = state.players.find((p) => p.seat + 1 === targetSeat);
  if (!target) return [];
  const reviewers = state.players.filter((p) => !p.isHuman);
  return reviewers.map((reviewer) => ({
    reviewer,
    reviewerSeat: reviewer.seat + 1,
    prompt: buildReviewPrompt(state, target, reviewer),
  }));
}

export function buildReviewPrompt(state: GameState, target: Player, reviewer: Player): string {
  const targetSeat = target.seat + 1;
  const reviewerSeat = reviewer.seat + 1;
  const winnerSide = state.winner === "wolf" ? "狼人" : "好人";
  const playersSummary = (state.players ?? [])
    .map((p) => `${p.seat + 1}号 ${p.displayName}（${p.role}${p.alive ? "" : "，已出局"}）`)
    .join("、");
  const historyText = Object.entries(state.dailySummaries || {})
    .map(([day, bullets]) => `第${day}天：${bullets.join("；")}`)
    .join("\n");
  const targetSpeeches = (state.messages || [])
    .filter((m) => !m.isSystem && m.playerId === target.playerId)
    .map((m) => m.content)
    .join("\n");

  return `你是狼人杀玩家复盘点评员，请以${reviewerSeat}号玩家「${reviewer.displayName}」的口吻，评价${targetSeat}号玩家「${target.displayName}」的整局表现。\n\n` +
    `【游戏结果】${winnerSide}阵营获胜\n` +
    `【玩家列表】${playersSummary}\n` +
    `【目标玩家发言】${targetSpeeches || "（无发言记录）"}\n` +
    `【局势摘要】\n${historyText || "（无摘要）"}\n\n` +
    `要求：\n` +
    `1. 点评字数在200-800字之间（中文字符数，含标点）。\n` +
    `2. 内容基于整局发言、场上行为、投票与站队，不要编造未发生事件。\n` +
    `3. 语气符合${reviewerSeat}号玩家的身份视角。\n` +
    `4. 仅输出JSON：{ "content": "..." }。`;
}

type ReviewRow = {
  id: string;
  game_id: string;
  target_player_id: string;
  target_seat: number;
  reviewer_player_id: string;
  reviewer_seat: number;
  reviewer_name: string;
  reviewer_role: string;
  reviewer_avatar: string;
  content: string;
  created_at: number;
  updated_at: number;
};

export function loadLlmConfigFromDb(db: Database.Database) {
  const row = db.prepare("SELECT * FROM llm_config WHERE id = 1").get() as
    | { base_url: string; api_key: string; model: string; models_json?: string | null; updated_at?: number }
    | undefined;
  initLlmConfig(normalizeLlmConfig(row ?? null));
  return row ?? null;
}

function mapReviewRow(row: ReviewRow): PlayerReviewCard {
  return {
    gameId: row.game_id,
    targetPlayerId: row.target_player_id,
    targetSeat: row.target_seat,
    reviewerPlayerId: row.reviewer_player_id,
    reviewerSeat: row.reviewer_seat,
    reviewerName: row.reviewer_name,
    reviewerRole: row.reviewer_role as PlayerReviewCard["reviewerRole"],
    reviewerAvatar: row.reviewer_avatar,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fetchReviewCards(db: Database.Database, gameId: string, targetSeat: number): PlayerReviewCard[] {
  const rows = db
    .prepare(
      "SELECT * FROM player_reviews WHERE game_id = ? AND target_seat = ? ORDER BY reviewer_seat ASC"
    )
    .all(gameId, targetSeat) as ReviewRow[];
  return rows.map(mapReviewRow);
}

export function insertReviewCards(db: Database.Database, cards: PlayerReviewCard[]) {
  if (cards.length === 0) return;
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO player_reviews
      (id, game_id, target_player_id, target_seat, reviewer_player_id, reviewer_seat, reviewer_name, reviewer_role, reviewer_avatar, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const tx = db.transaction((items: PlayerReviewCard[]) => {
    for (const card of items) {
      stmt.run(
        crypto.randomUUID ? crypto.randomUUID() : `review-${Date.now()}-${Math.random()}`,
        card.gameId,
        card.targetPlayerId,
        card.targetSeat,
        card.reviewerPlayerId,
        card.reviewerSeat,
        card.reviewerName,
        card.reviewerRole,
        card.reviewerAvatar,
        card.content,
        card.createdAt,
        card.updatedAt
      );
    }
  });
  tx(cards);
}

function buildRepairPrompt(content: string): string {
  return `请将以下点评改写为200-800字（中文字符数含标点），保持原意与语气，避免编造：\n\n${content}\n\n只输出JSON：{ "content": "..." }。`;
}

async function requestReviewContent(model: string, modelRef: ModelRef | undefined, prompt: string): Promise<string> {
  const baseOptions = {
    model,
    messages: [
      { role: "system" as const, content: "你是专业的狼人杀玩家复盘点评员。" },
      { role: "user" as const, content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 1200,
  };
  const options = mergeOptionsFromModelRef(modelRef, baseOptions);
  const result = await generateJSON<{ content: string }>(options);
  return (result?.content ?? "").trim();
}

async function generateReviewContentWithRetry(
  prompt: string,
  reviewerModel: string,
  reviewerModelRef: ModelRef | undefined,
  primaryModel: string
): Promise<string> {
  const maxReviewerAttempts = 2;
  let lastError: unknown = null;

  for (let i = 0; i < maxReviewerAttempts; i += 1) {
    try {
      const content = await requestReviewContent(reviewerModel, reviewerModelRef, prompt);
      if (isReviewLengthValid(content)) return content;
      const repaired = await requestReviewContent(reviewerModel, reviewerModelRef, buildRepairPrompt(content));
      return isReviewLengthValid(repaired) ? repaired : coerceReviewLength(repaired);
    } catch (error) {
      lastError = error;
    }
  }

  if (reviewerModel !== primaryModel) {
    const content = await requestReviewContent(primaryModel, undefined, prompt);
    if (isReviewLengthValid(content)) return content;
    const repaired = await requestReviewContent(primaryModel, undefined, buildRepairPrompt(content));
    return isReviewLengthValid(repaired) ? repaired : coerceReviewLength(repaired);
  }

  throw lastError ?? new Error("review generation failed");
}

export async function generateReviewCards(
  state: GameState,
  targetSeat: number
): Promise<PlayerReviewCard[]> {
  const target = state.players.find((p) => p.seat + 1 === targetSeat);
  if (!target) return [];
  const plan = buildReviewPlan(state, targetSeat);
  const primaryModel = getReviewModel();
  const now = Date.now();

  const cards: PlayerReviewCard[] = [];
  for (const item of plan) {
    const reviewer = item.reviewer;
    const modelRef = reviewer.agentProfile?.modelRef;
    const reviewerModel = modelRef?.model || primaryModel;
    const content = await generateReviewContentWithRetry(item.prompt, reviewerModel, modelRef, primaryModel);
    cards.push({
      gameId: state.gameId,
      targetPlayerId: target.playerId,
      targetSeat,
      reviewerPlayerId: reviewer.playerId,
      reviewerSeat: reviewer.seat + 1,
      reviewerName: reviewer.displayName,
      reviewerRole: reviewer.role,
      reviewerAvatar: reviewer.avatarSeed || reviewer.displayName,
      content,
      createdAt: now,
      updatedAt: now,
    });
  }

  return cards;
}
