import { LOCAL_LLM_DEFAULTS } from "@/lib/local-llm-settings";

export type LlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  updatedAt?: number;
};

type LlmConfigRow = {
  base_url: string;
  api_key: string;
  model: string;
  updated_at?: number;
};

let cachedConfig: LlmConfig | null = null;

export function normalizeLlmConfig(input: LlmConfig | LlmConfigRow | null): LlmConfig | null {
  if (!input) return null;
  if ("baseUrl" in input) return input;
  return {
    baseUrl: input.base_url,
    apiKey: input.api_key,
    model: input.model,
    updatedAt: input.updated_at,
  };
}

export function initLlmConfig(input: LlmConfig | LlmConfigRow | null) {
  cachedConfig = normalizeLlmConfig(input);
}

export function getLlmConfig(): LlmConfig | null {
  return cachedConfig;
}

export function getLlmConfigWithDefaults(): LlmConfig {
  return (
    cachedConfig ?? {
      baseUrl: LOCAL_LLM_DEFAULTS.baseUrl,
      apiKey: "",
      model: LOCAL_LLM_DEFAULTS.model,
    }
  );
}

export function isLlmConfigured(): boolean {
  return Boolean(cachedConfig?.apiKey) && Boolean(cachedConfig?.baseUrl);
}

export async function fetchLlmConfig(): Promise<LlmConfig | null> {
  if (typeof window === "undefined") return cachedConfig;
  try {
    const res = await fetch("/api/local-config");
    if (!res.ok) return cachedConfig;
    const json = (await res.json()) as { data?: LlmConfigRow | null };
    cachedConfig = normalizeLlmConfig(json.data ?? null);
    return cachedConfig;
  } catch {
    return cachedConfig;
  }
}

export async function saveLlmConfig(config: LlmConfig): Promise<void> {
  cachedConfig = config;
  if (typeof window === "undefined") return;
  await fetch("/api/local-config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      base_url: config.baseUrl,
      api_key: config.apiKey,
      model: config.model,
    }),
  });
}
