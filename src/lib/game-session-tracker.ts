/**
 * 本地游戏会话追踪器（无账号/无后端）
 * 仅在内存中统计，必要时可扩展为 localStorage 持久化
 */

export interface GameSessionConfig {
  playerCount: number;
  difficulty?: string;
  usedCustomKey: boolean;
  modelUsed?: string;
}

interface SessionState {
  sessionId: string | null;
  startTime: number;
  config: GameSessionConfig | null;
  roundsPlayed: number;
  aiCallsCount: number;
  aiInputChars: number;
  aiOutputChars: number;
  aiPromptTokens: number;
  aiCompletionTokens: number;
}

const createInitialState = (): SessionState => ({
  sessionId: null,
  startTime: 0,
  config: null,
  roundsPlayed: 0,
  aiCallsCount: 0,
  aiInputChars: 0,
  aiOutputChars: 0,
  aiPromptTokens: 0,
  aiCompletionTokens: 0,
});

let state: SessionState = createInitialState();

function generateSessionId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const gameSessionTracker = {
  async start(config: GameSessionConfig): Promise<string | null> {
    state = {
      ...createInitialState(),
      startTime: Date.now(),
      config,
      sessionId: generateSessionId(),
    };
    return state.sessionId;
  },

  async incrementRound() {
    state.roundsPlayed += 1;
  },

  addAiCall(stats: { inputChars: number; outputChars: number; promptTokens?: number; completionTokens?: number }) {
    state.aiCallsCount += 1;
    state.aiInputChars += stats.inputChars;
    state.aiOutputChars += stats.outputChars;
    if (stats.promptTokens) state.aiPromptTokens += stats.promptTokens;
    if (stats.completionTokens) state.aiCompletionTokens += stats.completionTokens;
  },

  getSummary() {
    if (!state.config) return null;
    const durationSeconds = Math.round((Date.now() - state.startTime) / 1000);
    return {
      sessionId: state.sessionId ?? undefined,
      winner: null as "wolf" | "villager" | null,
      completed: false,
      roundsPlayed: state.roundsPlayed,
      durationSeconds,
      aiCallsCount: state.aiCallsCount,
      aiInputChars: state.aiInputChars,
      aiOutputChars: state.aiOutputChars,
      aiPromptTokens: state.aiPromptTokens,
      aiCompletionTokens: state.aiCompletionTokens,
    };
  },

  async syncProgress() {
    // no-op for local mode
  },

  async end(_winner: "wolf" | "villager", _completed: boolean) {
    // no-op for local mode
  },
};
