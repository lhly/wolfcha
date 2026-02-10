"use client";

import { useEffect } from "react";
import { useSetAtom } from "jotai";
import type { GameState } from "@/types/game";
import { rawGameStateAtom } from "@/store/game-machine";
import { initLlmConfig } from "@/lib/llm-config";

const MIGRATION_KEY = "local_storage_migrated";
const LLM_BASE_URL_KEY = "wolfcha_llm_base_url";
const LLM_API_KEY_KEY = "wolfcha_llm_api_key";
const LLM_MODEL_KEY = "wolfcha_llm_model";
const GAME_STATE_KEY = "wolfcha.game_state";
const CUSTOM_CHARACTERS_KEY = "wolfcha_custom_characters";

type PersistedGameState = {
  version?: number;
  state?: GameState;
  savedAt?: number;
};

export function useLocalStorageMigration() {
  const setGameState = useSetAtom(rawGameStateAtom);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const run = async () => {
      try {
        const metaRes = await fetch(`/api/meta?key=${MIGRATION_KEY}`);
        if (metaRes.ok) {
          const metaJson = (await metaRes.json()) as { data?: string | null };
          if (metaJson.data === "true") return;
        }

        const baseUrl = window.localStorage.getItem(LLM_BASE_URL_KEY)?.trim() ?? "";
        const apiKey = window.localStorage.getItem(LLM_API_KEY_KEY)?.trim() ?? "";
        const model = window.localStorage.getItem(LLM_MODEL_KEY)?.trim() ?? "";
        if (baseUrl && apiKey && model) {
          await fetch("/api/local-config", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base_url: baseUrl,
              api_key: apiKey,
              model,
            }),
          });
          initLlmConfig({ baseUrl, apiKey, model });
        }

        const rawGame = window.localStorage.getItem(GAME_STATE_KEY);
        if (rawGame) {
          try {
            const parsed = JSON.parse(rawGame) as PersistedGameState;
            if (parsed?.state) {
              await fetch("/api/game-state", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  version: parsed.version ?? 1,
                  state: parsed.state,
                }),
              });
              if (!cancelled) {
                setGameState(parsed.state);
              }
            }
          } catch {
            // ignore malformed game state
          }
        }

        const rawCharacters = window.localStorage.getItem(CUSTOM_CHARACTERS_KEY);
        if (rawCharacters) {
          try {
            const list = JSON.parse(rawCharacters) as unknown[];
            if (Array.isArray(list)) {
              for (const item of list) {
                await fetch("/api/custom-characters", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(item),
                });
              }
            }
          } catch {
            // ignore malformed custom characters
          }
        }

        await fetch("/api/meta", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: MIGRATION_KEY, value: "true" }),
        });

        window.localStorage.removeItem(LLM_BASE_URL_KEY);
        window.localStorage.removeItem(LLM_API_KEY_KEY);
        window.localStorage.removeItem(LLM_MODEL_KEY);
        window.localStorage.removeItem(GAME_STATE_KEY);
        window.localStorage.removeItem(CUSTOM_CHARACTERS_KEY);
      } catch {
        // ignore migration failures
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [setGameState]);
}
