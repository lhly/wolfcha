export interface GameStatsConfig {
  userId?: string;
  playerCount: number;
  difficulty?: string;
  usedCustomKey: boolean;
  modelUsed?: string;
  userAgent?: string;
}

export interface AiCallStats {
  inputChars: number;
  outputChars: number;
  promptTokens?: number;
  completionTokens?: number;
}

export interface GameStatsSummary {
  sessionId?: string;
  winner: "wolf" | "villager" | null;
  completed: boolean;
  roundsPlayed: number;
  durationSeconds: number;
  aiCallsCount: number;
  aiInputChars: number;
  aiOutputChars: number;
  aiPromptTokens: number;
  aiCompletionTokens: number;
}

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

let globalStats: StatsState = createInitialState();

export const gameStatsTracker = {
  start(config: GameStatsConfig) {
    globalStats = {
      ...createInitialState(),
      startTime: Date.now(),
      config,
    };
  },

  setSessionId(sessionId: string) {
    globalStats.sessionId = sessionId;
  },

  getSessionId(): string | null {
    return globalStats.sessionId;
  },

  getConfig(): GameStatsConfig | null {
    return globalStats.config;
  },

  addAiCall(stats: AiCallStats) {
    globalStats.aiCallsCount += 1;
    globalStats.aiInputChars += stats.inputChars;
    globalStats.aiOutputChars += stats.outputChars;
    if (stats.promptTokens) globalStats.aiPromptTokens += stats.promptTokens;
    if (stats.completionTokens) globalStats.aiCompletionTokens += stats.completionTokens;
  },

  incrementRound() {
    globalStats.roundsPlayed += 1;
  },

  getSummary(winner: "wolf" | "villager" | null, completed: boolean): GameStatsSummary | null {
    if (!globalStats.config) return null;

    const durationSeconds = Math.round((Date.now() - globalStats.startTime) / 1000);

    return {
      sessionId: globalStats.sessionId ?? undefined,
      winner,
      completed,
      roundsPlayed: globalStats.roundsPlayed,
      durationSeconds,
      aiCallsCount: globalStats.aiCallsCount,
      aiInputChars: globalStats.aiInputChars,
      aiOutputChars: globalStats.aiOutputChars,
      aiPromptTokens: globalStats.aiPromptTokens,
      aiCompletionTokens: globalStats.aiCompletionTokens,
    };
  },

  reset() {
    globalStats = createInitialState();
  },
};
