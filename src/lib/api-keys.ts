import { getLlmConfigWithDefaults, isLlmConfigured, saveLlmConfig } from "@/lib/llm-config";
import { clearLocalLlmSettings } from "@/lib/local-llm-settings";

const MINIMAX_API_KEY_STORAGE = "wolfcha_minimax_api_key";
const MINIMAX_GROUP_ID_STORAGE = "wolfcha_minimax_group_id";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStorage(key: string): string {
  if (!canUseStorage()) return "";
  const value = window.localStorage.getItem(key);
  return typeof value === "string" ? value.trim() : "";
}

function writeStorage(key: string, value: string) {
  if (!canUseStorage()) return;
  const trimmed = value.trim();
  if (!trimmed) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, trimmed);
}

// ===== Local LLM Settings (OpenAI-compatible) =====

export function getBaseUrl(): string {
  return getLlmConfigWithDefaults().baseUrl;
}

export function setBaseUrl(value: string) {
  const cfg = getLlmConfigWithDefaults();
  void saveLlmConfig({ ...cfg, baseUrl: value.trim() });
}

export function getApiKey(): string {
  return getLlmConfigWithDefaults().apiKey;
}

export function setApiKey(value: string) {
  const cfg = getLlmConfigWithDefaults();
  void saveLlmConfig({ ...cfg, apiKey: value.trim() });
}

export function getGeneratorModel(): string {
  return getLlmConfigWithDefaults().model;
}

export function setGeneratorModel(model: string) {
  const cfg = getLlmConfigWithDefaults();
  const trimmed = model.trim();
  void saveLlmConfig({ ...cfg, model: trimmed, models: trimmed ? [trimmed] : cfg.models });
}

export function getSummaryModel(): string {
  return getLlmConfigWithDefaults().model;
}

export function setSummaryModel(model: string) {
  const cfg = getLlmConfigWithDefaults();
  const trimmed = model.trim();
  void saveLlmConfig({ ...cfg, model: trimmed, models: trimmed ? [trimmed] : cfg.models });
}

export function getReviewModel(): string {
  return getLlmConfigWithDefaults().model;
}

export function setReviewModel(model: string) {
  const cfg = getLlmConfigWithDefaults();
  const trimmed = model.trim();
  void saveLlmConfig({ ...cfg, model: trimmed, models: trimmed ? [trimmed] : cfg.models });
}

export function getSelectedModels(): string[] {
  const cfg = getLlmConfigWithDefaults();
  if (Array.isArray(cfg.models) && cfg.models.length > 0) return cfg.models;
  return cfg.model ? [cfg.model] : [];
}

export function setSelectedModels(models: string[]) {
  const normalized = Array.from(
    new Set(models.map((m) => String(m ?? "").trim()).filter(Boolean))
  );
  if (normalized.length === 0) return;
  const cfg = getLlmConfigWithDefaults();
  void saveLlmConfig({ ...cfg, model: normalized[0], models: normalized });
}

export function isCustomKeyEnabled(): boolean {
  return isLlmConfigured();
}

export function clearApiKeys() {
  const cfg = getLlmConfigWithDefaults();
  void saveLlmConfig({ ...cfg, apiKey: "" });
  clearLocalLlmSettings();
  if (!canUseStorage()) return;
  window.localStorage.removeItem(MINIMAX_API_KEY_STORAGE);
  window.localStorage.removeItem(MINIMAX_GROUP_ID_STORAGE);
}

// ===== Optional TTS (Minimax) =====

export function getMinimaxApiKey(): string {
  return readStorage(MINIMAX_API_KEY_STORAGE);
}

export function setMinimaxApiKey(key: string) {
  writeStorage(MINIMAX_API_KEY_STORAGE, key);
}

export function getMinimaxGroupId(): string {
  return readStorage(MINIMAX_GROUP_ID_STORAGE);
}

export function setMinimaxGroupId(id: string) {
  writeStorage(MINIMAX_GROUP_ID_STORAGE, id);
}

export function hasMinimaxKey(): boolean {
  return Boolean(getMinimaxApiKey()) && Boolean(getMinimaxGroupId());
}

// Backward-compat placeholders (unused after auth removal)
export function getZenmuxApiKey(): string {
  return "";
}

export function getDashscopeApiKey(): string {
  return "";
}

export function hasZenmuxKey(): boolean {
  return false;
}

export function hasDashscopeKey(): boolean {
  return false;
}

export function setZenmuxApiKey(_key: string) {}
export function setDashscopeApiKey(_key: string) {}
