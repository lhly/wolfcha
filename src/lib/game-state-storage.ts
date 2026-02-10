import type { GameState } from "@/types/game";

export async function fetchPersistedGameState(): Promise<{
  version: number;
  state: GameState;
  saved_at: number;
} | null> {
  const res = await fetch("/api/game-state");
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: { version: number; state: GameState; saved_at: number } | null };
  return json.data ?? null;
}

export async function savePersistedGameState(state: GameState, version: number): Promise<void> {
  await fetch("/api/game-state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version, state }),
  });
}

export async function clearPersistedGameState(): Promise<void> {
  await fetch("/api/game-state", { method: "DELETE" });
}
