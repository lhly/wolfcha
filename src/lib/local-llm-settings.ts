const BASE_URL_KEY = "wolfcha_llm_base_url";
const API_KEY_KEY = "wolfcha_llm_api_key";
const MODEL_KEY = "wolfcha_llm_model";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStorage(key: string): string {
  if (!canUseStorage()) return "";
  return (window.localStorage.getItem(key) ?? "").trim();
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

export function getLocalLlmBaseUrl(): string {
  return readStorage(BASE_URL_KEY) || DEFAULT_BASE_URL;
}

export function setLocalLlmBaseUrl(value: string) {
  writeStorage(BASE_URL_KEY, value);
}

export function getLocalLlmApiKey(): string {
  return readStorage(API_KEY_KEY);
}

export function setLocalLlmApiKey(value: string) {
  writeStorage(API_KEY_KEY, value);
}

export function getLocalLlmModel(): string {
  return readStorage(MODEL_KEY) || DEFAULT_MODEL;
}

export function setLocalLlmModel(value: string) {
  writeStorage(MODEL_KEY, value);
}

export function clearLocalLlmSettings() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(BASE_URL_KEY);
  window.localStorage.removeItem(API_KEY_KEY);
  window.localStorage.removeItem(MODEL_KEY);
}

export function isLocalLlmConfigured(): boolean {
  return Boolean(getLocalLlmApiKey()) && Boolean(getLocalLlmBaseUrl());
}

export const LOCAL_LLM_DEFAULTS = {
  baseUrl: DEFAULT_BASE_URL,
  model: DEFAULT_MODEL,
};
