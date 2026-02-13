export type ReviewFetchGate = {
  hasItems: boolean;
  hasAttempted: boolean;
  isLoading: boolean;
  hasError: boolean;
};

export function isValidReviewRequest(gameId: string | undefined, seat: number): boolean {
  if (!gameId || !gameId.trim()) return false;
  if (!Number.isFinite(seat)) return false;
  return seat > 0;
}

export function shouldAutoFetchReviews(state: ReviewFetchGate): boolean {
  if (state.isLoading) return false;
  if (state.hasItems) return false;
  if (state.hasAttempted) return false;
  if (state.hasError) return false;
  return true;
}
