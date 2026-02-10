"use client";

import { useCallback, useEffect, useState } from "react";
import type { CustomCharacter, CustomCharacterInput } from "@/types/custom-character";
import {
  DEFAULT_CUSTOM_CHARACTER_AGE,
  DEFAULT_CUSTOM_CHARACTER_GENDER,
  MAX_CUSTOM_CHARACTERS,
} from "@/types/custom-character";
import { fillCustomCharacterOptionalFields } from "@/lib/custom-character-defaults";

const API_URL = "/api/custom-characters";

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useCustomCharacters() {
  const [characters, setCharacters] = useState<CustomCharacter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`Failed to fetch characters: ${res.status}`);
      const json = (await res.json()) as { data?: CustomCharacter[] };
      const list = Array.isArray(json.data) ? json.data : [];
      setCharacters(list.filter((c) => !c.is_deleted));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch characters");
    } finally {
      setLoading(false);
    }
  }, []);

  const createCharacter = useCallback(
    async (input: CustomCharacterInput): Promise<CustomCharacter | null> => {
      if (characters.length >= MAX_CUSTOM_CHARACTERS) {
        setError(`Maximum ${MAX_CUSTOM_CHARACTERS} custom characters allowed`);
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const normalizedInput = fillCustomCharacterOptionalFields(input);
        const avatarSeed = input.avatar_seed || `${input.display_name}-${Date.now()}`;
        const now = new Date().toISOString();
        const newChar: CustomCharacter = {
          id: generateId(),
          user_id: "local",
          display_name: normalizedInput.display_name.trim(),
          gender: normalizedInput.gender,
          age: normalizedInput.age,
          mbti: normalizedInput.mbti.toUpperCase(),
          basic_info: normalizedInput.basic_info?.trim() || undefined,
          style_label: normalizedInput.style_label?.trim() || undefined,
          avatar_seed: avatarSeed,
          is_deleted: false,
          created_at: now,
          updated_at: now,
        };

        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newChar),
        });
        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          throw new Error(msg || "Failed to create character");
        }
        const json = (await res.json()) as { data?: CustomCharacter };
        const created = json.data ?? newChar;
        setCharacters((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create character");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [characters]
  );

  const updateCharacter = useCallback(
    async (id: string, input: Partial<CustomCharacterInput>): Promise<CustomCharacter | null> => {
      setLoading(true);
      setError(null);

      try {
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString(), id };

        const shouldNormalizeOptionalFields =
          input.mbti !== undefined || input.basic_info !== undefined || input.style_label !== undefined;
        const normalizedInput = shouldNormalizeOptionalFields
          ? fillCustomCharacterOptionalFields({
              display_name: input.display_name ?? "",
              gender: (input.gender as CustomCharacterInput["gender"]) ?? DEFAULT_CUSTOM_CHARACTER_GENDER,
              age: input.age ?? DEFAULT_CUSTOM_CHARACTER_AGE,
              mbti: input.mbti ?? "",
              basic_info: input.basic_info ?? "",
              style_label: input.style_label ?? "",
              avatar_seed: input.avatar_seed,
            })
          : null;

        if (input.display_name !== undefined) updateData.display_name = input.display_name.trim();
        if (input.gender !== undefined) updateData.gender = input.gender;
        if (input.age !== undefined) updateData.age = input.age;
        if (input.mbti !== undefined) updateData.mbti = (normalizedInput?.mbti ?? input.mbti).toUpperCase();
        if (input.basic_info !== undefined)
          updateData.basic_info = normalizedInput?.basic_info?.trim() || undefined;
        if (input.style_label !== undefined)
          updateData.style_label = normalizedInput?.style_label?.trim() || undefined;
        if (input.avatar_seed !== undefined) updateData.avatar_seed = input.avatar_seed;

        const res = await fetch(API_URL, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });
        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          throw new Error(msg || "Failed to update character");
        }
        const json = (await res.json()) as { data?: CustomCharacter };
        const updated = json.data ?? null;
        if (updated) {
          setCharacters((prev) => prev.map((c) => (c.id === id ? updated : c)));
        }
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update character");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteCharacter = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Failed to delete character");
      }
      setCharacters((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete character");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCharacters();
  }, [fetchCharacters]);

  return {
    characters,
    loading,
    error,
    fetchCharacters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    canAddMore: characters.length < MAX_CUSTOM_CHARACTERS,
    remainingSlots: MAX_CUSTOM_CHARACTERS - characters.length,
  };
}
