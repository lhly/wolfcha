import {
  clearLocalLlmSettings,
  getLocalLlmApiKey,
  getLocalLlmBaseUrl,
  getLocalLlmModel,
  setLocalLlmApiKey,
  setLocalLlmBaseUrl,
  setLocalLlmModel,
  isLocalLlmConfigured,
} from "@/lib/local-llm-settings";

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
  return getLocalLlmBaseUrl();
}

export function setBaseUrl(value: string) {
  setLocalLlmBaseUrl(value);
}

export function getApiKey(): string {
  return getLocalLlmApiKey();
}

export function setApiKey(value: string) {
  setLocalLlmApiKey(value);
}

export function getGeneratorModel(): string {
  return getLocalLlmModel();
}

export function setGeneratorModel(model: string) {
  setLocalLlmModel(model);
}

export function getSummaryModel(): string {
  return getLocalLlmModel();
}

export function setSummaryModel(model: string) {
  setLocalLlmModel(model);
}

export function getReviewModel(): string {
  return getLocalLlmModel();
}

export function setReviewModel(model: string) {
  setLocalLlmModel(model);
}

export function getSelectedModels(): string[] {
  const model = getLocalLlmModel();
  return model ? [model] : [];
}

export function setSelectedModels(models: string[]) {
  if (models.length === 0) return;
  setLocalLlmModel(models[0]);
}

export function isCustomKeyEnabled(): boolean {
  return isLocalLlmConfigured();
}

export function clearApiKeys() {
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
