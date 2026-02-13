"use client";

import { useCallback, useRef } from "react";
import type { AiCallStats, GameStatsConfig, GameStatsSummary } from "@/lib/game-stats-tracker";
export { gameStatsTracker } from "@/lib/game-stats-tracker";

interface StatsState {
  sessionId: string | null;
  startTime: number;
  config: GameStatsConfig | null;
  aiCallsCount: number;
  aiInputChars: number;
  aiOutputChars: number;
  aiPromptTokens: number;
  aiCompletionTokens: number;
  roundsPlayed: number;
}

const createInitialState = (): StatsState => ({
  sessionId: null,
  startTime: 0,
  config: null,
  aiCallsCount: 0,
  aiInputChars: 0,
  aiOutputChars: 0,
  aiPromptTokens: 0,
  aiCompletionTokens: 0,
  roundsPlayed: 0,
});

export function useGameStats() {
  const statsRef = useRef<StatsState>(createInitialState());

  const startSession = useCallback((config: GameStatsConfig) => {
    statsRef.current = {
      ...createInitialState(),
      startTime: Date.now(),
      config,
    };
  }, []);

  const addAiCall = useCallback((stats: AiCallStats) => {
    const s = statsRef.current;
    s.aiCallsCount += 1;
    s.aiInputChars += stats.inputChars;
    s.aiOutputChars += stats.outputChars;
    if (stats.promptTokens) s.aiPromptTokens += stats.promptTokens;
    if (stats.completionTokens) s.aiCompletionTokens += stats.completionTokens;
  }, []);

  const incrementRound = useCallback(() => {
    statsRef.current.roundsPlayed += 1;
  }, []);

  const getSummary = useCallback((winner: "wolf" | "villager" | null, completed: boolean): GameStatsSummary | null => {
    const s = statsRef.current;
    if (!s.config) return null;

    const durationSeconds = Math.round((Date.now() - s.startTime) / 1000);

    return {
      sessionId: s.sessionId ?? undefined,
      winner,
      completed,
      roundsPlayed: s.roundsPlayed,
      durationSeconds,
      aiCallsCount: s.aiCallsCount,
      aiInputChars: s.aiInputChars,
      aiOutputChars: s.aiOutputChars,
      aiPromptTokens: s.aiPromptTokens,
      aiCompletionTokens: s.aiCompletionTokens,
    };
  }, []);

  const reset = useCallback(() => {
    statsRef.current = createInitialState();
  }, []);

  return {
    startSession,
    addAiCall,
    incrementRound,
    getSummary,
    reset,
  };
}
