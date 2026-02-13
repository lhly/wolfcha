"use client";

import { useCallback, useEffect, useState } from "react";
import type { GameAnalysisReport } from "@/types/analysis";
import type { GameState } from "@/types/game";
import { generateGameAnalysis } from "@/lib/game-analysis";
import { getReviewModel } from "@/lib/api-keys";
import {
  buildGameAnalysisReport,
  fetchGameAnalysisReport,
  saveGameAnalysisReport,
} from "@/lib/game-analysis-api";
import { fetchGameHistoryDetail } from "@/lib/game-history";

function normalizeHistoryState(state: GameState, summary: unknown | null): GameState {
  if (!summary || typeof summary !== "object") return state;
  const summaryObj = summary as { winner?: "village" | "wolf"; dailySummaries?: GameState["dailySummaries"]; dailySummaryFacts?: GameState["dailySummaryFacts"] };
  const winner = state.winner ?? summaryObj.winner ?? null;
  const dailySummaries = Object.keys(state.dailySummaries ?? {}).length > 0
    ? state.dailySummaries
    : summaryObj.dailySummaries ?? state.dailySummaries;
  const dailySummaryFacts = Object.keys(state.dailySummaryFacts ?? {}).length > 0
    ? state.dailySummaryFacts
    : summaryObj.dailySummaryFacts ?? state.dailySummaryFacts;
  if (winner === state.winner && dailySummaries === state.dailySummaries && dailySummaryFacts === state.dailySummaryFacts) {
    return state;
  }
  return {
    ...state,
    winner,
    dailySummaries,
    dailySummaryFacts,
  };
}

export function useGameAnalysisReport(gameId?: string) {
  const [analysisData, setAnalysisData] = useState<GameAnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    if (!gameId) return;
    setIsLoading(true);
    setError(null);
    try {
      const existing = await fetchGameAnalysisReport(gameId);
      if (existing) {
        setAnalysisData(existing);
        return;
      }

      const history = await fetchGameHistoryDetail(gameId);
      if (!history?.state) {
        throw new Error("Missing game history state");
      }

      const baseState = history.state as GameState;
      const normalizedState = normalizeHistoryState(baseState, history.summary ?? null);
      const reviewModel = getReviewModel();

      let durationSeconds = 0;
      if (history.started_at && history.ended_at) {
        durationSeconds = Math.max(0, Math.round((history.ended_at - history.started_at) / 1000));
      }

      const data = await generateGameAnalysis(normalizedState, reviewModel, durationSeconds);
      const report = buildGameAnalysisReport(data, normalizedState.messages ?? []);
      await saveGameAnalysisReport(report);
      setAnalysisData(report);
    } catch (err) {
      const message = err instanceof Error ? err.message : "复盘报告加载失败";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    void loadReport();
  }, [gameId, loadReport]);

  return {
    analysisData,
    isLoading,
    error,
    reload: loadReport,
  };
}
