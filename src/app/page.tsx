import HomeClient from "./HomeClient";
import { getDb } from "@/lib/sqlite";

export const runtime = "nodejs";

type LlmRow = { base_url: string; api_key: string; model: string; updated_at: number };
type GameRow = { version: number; state_json: string; saved_at: number };

export default function Page() {
  const db = getDb();
  const llm = db.prepare("SELECT base_url, api_key, model, updated_at FROM llm_config WHERE id = 1").get() as
    | LlmRow
    | undefined;
  const game = db.prepare("SELECT version, state_json, saved_at FROM game_state WHERE id = 1").get() as
    | GameRow
    | undefined;
  const initialGame = game
    ? {
        version: game.version,
        state: JSON.parse(game.state_json),
        saved_at: game.saved_at,
      }
    : null;

  return <HomeClient initialLlm={llm ?? null} initialGame={initialGame} />;
}
