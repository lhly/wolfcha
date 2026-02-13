import type { GameState } from "@/types/game";

type GameHistoryResponse<T> = { ok: boolean; data?: T; error?: string };

type ResumeData = {
  id: string;
  game_id: string;
  started_at: number | null;
  ended_at: number | null;
  winner: string | null;
  status: string;
  updated_at: number;
  created_at: number;
  summary: unknown | null;
  state: unknown | null;
  checkpointState: unknown | null;
};

async function postGameHistory<T>(payload: Record<string, unknown>): Promise<GameHistoryResponse<T>> {
  const res = await fetch("/api/game-history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as GameHistoryResponse<T>;
  if (!res.ok) {
    throw new Error(json.error ?? "game-history request failed");
  }
  return json;
}

export async function startGameHistory(state: GameState) {
  return postGameHistory<{ id: string }>({
    action: "start",
    game_id: state.gameId,
    started_at: state.startTime ?? null,
    state,
  });
}

export async function checkpointGameHistory(state: GameState) {
  return postGameHistory<void>({
    action: "checkpoint",
    game_id: state.gameId,
    state,
  });
}

export async function pauseGameHistory(state: GameState) {
  return postGameHistory<void>({
    action: "pause",
    game_id: state.gameId,
  });
}

export async function resumeGameHistory(gameId: string) {
  const result = await postGameHistory<ResumeData | null>({
    action: "resume",
    game_id: gameId,
  });
  return result.data ?? null;
}

export async function fetchGameHistoryDetail(gameId: string) {
  const res = await fetch(`/api/game-history?id=${encodeURIComponent(gameId)}`);
  const json = (await res.json()) as GameHistoryResponse<ResumeData | null>;
  if (!res.ok) {
    throw new Error(json.error ?? "game-history request failed");
  }
  return json.data ?? null;
}

export async function completeGameHistory(state: GameState, winner: "village" | "wolf") {
  const summary = {
    winner,
    dailySummaries: state.dailySummaries,
    dailySummaryFacts: state.dailySummaryFacts,
  };
  return postGameHistory<void>({
    action: "complete",
    game_id: state.gameId,
    started_at: state.startTime ?? null,
    ended_at: Date.now(),
    winner,
    summary,
    state,
  });
}
