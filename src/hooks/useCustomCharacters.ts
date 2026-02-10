"use client";

import { useCallback, useEffect, useState } from "react";
import type { CustomCharacter, CustomCharacterInput } from "@/types/custom-character";
import {
  DEFAULT_CUSTOM_CHARACTER_AGE,
  DEFAULT_CUSTOM_CHARACTER_GENDER,
  MAX_CUSTOM_CHARACTERS,
} from "@/types/custom-character";
import { fillCustomCharacterOptionalFields } from "@/lib/custom-character-defaults";

const STORAGE_KEY = "wolfcha_custom_characters";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readCharacters(): CustomCharacter[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as CustomCharacter[];
  } catch {
    return [];
  }
}

function writeCharacters(list: CustomCharacter[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

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
      const data = readCharacters().filter((c) => !c.is_deleted);
      setCharacters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch characters");
    } finally {
      setLoading(false);
    }
  }, []);

  const createCharacter = useCallback(async (input: CustomCharacterInput): Promise<CustomCharacter | null> => {
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

      const next = [newChar, ...characters];
      setCharacters(next);
      writeCharacters(next);
      return newChar;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create character");
      return null;
    } finally {
      setLoading(false);
    }
  }, [characters]);

  const updateCharacter = useCallback(async (
    id: string,
    input: Partial<CustomCharacterInput>
  ): Promise<CustomCharacter | null> => {
    setLoading(true);
    setError(null);

    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

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
      if (input.basic_info !== undefined) updateData.basic_info = normalizedInput?.basic_info?.trim() || undefined;
      if (input.style_label !== undefined) updateData.style_label = normalizedInput?.style_label?.trim() || undefined;
      if (input.avatar_seed !== undefined) updateData.avatar_seed = input.avatar_seed;

      const next = characters.map((c) => {
        if (c.id !== id) return c;
        return { ...c, ...updateData } as CustomCharacter;
      });

      const updated = next.find((c) => c.id === id) ?? null;
      setCharacters(next);
      writeCharacters(next);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update character");
      return null;
    } finally {
      setLoading(false);
    }
  }, [characters]);

  const deleteCharacter = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const next = characters.filter((c) => c.id !== id);
      setCharacters(next);
      writeCharacters(next);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete character");
      return false;
    } finally {
      setLoading(false);
    }
  }, [characters]);

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
