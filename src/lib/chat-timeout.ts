const DEFAULT_CHAT_API_TIMEOUT_MS = 60000;

export function getChatApiTimeoutMs(): number {
  const raw = process.env.CHAT_API_TIMEOUT_MS;
  if (!raw) return DEFAULT_CHAT_API_TIMEOUT_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_CHAT_API_TIMEOUT_MS;
  return Math.floor(parsed);
}
