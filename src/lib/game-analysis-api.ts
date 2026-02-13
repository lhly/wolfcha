import type { GameAnalysisData, GameAnalysisReport } from "@/types/analysis";
import type { ChatMessage } from "@/types/game";

type GameAnalysisApiResponse<T> = { ok: boolean; data?: T; error?: string };

export function buildGameAnalysisReport(
  data: GameAnalysisData,
  messages: ChatMessage[]
): GameAnalysisReport {
  return { ...data, messages };
}

export async function fetchGameAnalysisReport(
  gameId: string
): Promise<GameAnalysisReport | null> {
  const res = await fetch(`/api/game-analysis?game_id=${encodeURIComponent(gameId)}`);
  const json = (await res.json().catch(() => ({}))) as GameAnalysisApiResponse<GameAnalysisReport | null>;
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to fetch game analysis");
  }
  return json.data ?? null;
}

export async function saveGameAnalysisReport(report: GameAnalysisReport): Promise<void> {
  const res = await fetch("/api/game-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: report.gameId, report }),
  });
  const json = (await res.json().catch(() => ({}))) as GameAnalysisApiResponse<GameAnalysisReport>;
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to save game analysis");
  }
}
