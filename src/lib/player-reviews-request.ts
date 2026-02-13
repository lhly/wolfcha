export type NormalizedReviewRequest = {
  gameId: string;
  targetSeat: number;
  force: boolean;
};

export type ParseReviewRequestResult =
  | { ok: true; value: NormalizedReviewRequest }
  | { ok: false; error: "Missing game_id or target_seat" };

function coerceToObject(input: unknown): Record<string, unknown> | null {
  if (!input) return null;
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as unknown;
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof input === "object") return input as Record<string, unknown>;
  return null;
}

export function normalizeReviewRequestBody(input: unknown): NormalizedReviewRequest | null {
  const obj = coerceToObject(input);
  if (!obj) return null;
  const rawGameId = typeof obj.game_id === "string" ? obj.game_id.trim() : "";
  if (!rawGameId) return null;

  const rawSeat = obj.target_seat;
  const seatNumber =
    typeof rawSeat === "number"
      ? rawSeat
      : typeof rawSeat === "string"
        ? Number(rawSeat)
        : NaN;
  if (!Number.isFinite(seatNumber) || seatNumber <= 0) return null;

  const force = obj.force === true;
  return {
    gameId: rawGameId,
    targetSeat: Math.floor(seatNumber),
    force,
  };
}

export function parseReviewRequestBody(input: unknown): ParseReviewRequestResult {
  const normalized = normalizeReviewRequestBody(input);
  if (!normalized) {
    return { ok: false, error: "Missing game_id or target_seat" };
  }
  return { ok: true, value: normalized };
}
