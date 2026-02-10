import type { GameState } from "@/types/game";

export async function saveGameHistory(state: GameState, winner: "village" | "wolf") {
  const summary = {
    winner,
    dailySummaries: state.dailySummaries,
    dailySummaryFacts: state.dailySummaryFacts,
  };
  await fetch("/api/game-history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      game_id: state.gameId,
      started_at: state.startTime ?? null,
      ended_at: Date.now(),
      winner,
      summary,
      state,
    }),
  });
}
