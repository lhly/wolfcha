export type ParseGameAnalysisRequestResult =
  | { ok: true; value: { gameId: string; report: Record<string, unknown> } }
  | { ok: false; error: string };

function coerceToRecord(input: unknown): Record<string, unknown> | null {
  if (!input) return null;
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
  if (typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  return null;
}

export function parseGameAnalysisRequestBody(input: unknown): ParseGameAnalysisRequestResult {
  const obj = coerceToRecord(input);
  if (!obj) return { ok: false, error: "Invalid request body" };
  const rawGameId = typeof obj.game_id === "string" ? obj.game_id.trim() : "";
  if (!rawGameId) return { ok: false, error: "Missing game_id" };
  const report = coerceToRecord(obj.report);
  if (!report) return { ok: false, error: "Missing report" };
  return { ok: true, value: { gameId: rawGameId, report } };
}
