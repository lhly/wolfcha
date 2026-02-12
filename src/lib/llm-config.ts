import { LOCAL_LLM_DEFAULTS } from "@/lib/local-llm-settings";

export type LlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  models: string[];
  updatedAt?: number;
};

type LlmConfigRow = {
  base_url: string;
  api_key: string;
  model: string;
  models_json?: string | null;
  updated_at?: number;
};

let cachedConfig: LlmConfig | null = null;

function normalizeModels(input: { model?: string; models?: string[] }): string[] {
  if (Array.isArray(input.models) && input.models.length > 0) {
    return input.models;
  }
  if (input.model) return [input.model];
  return [];
}

function parseModelsJson(raw: string | null | undefined, fallbackModel: string): string[] {
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((item) => typeof item === "string" && item.trim());
      }
    } catch {
      // ignore
    }
  }
  return fallbackModel ? [fallbackModel] : [];
}

export function normalizeLlmConfig(input: LlmConfig | LlmConfigRow | null): LlmConfig | null {
  if (!input) return null;
  if ("baseUrl" in input) {
    const models = normalizeModels(input);
    return { ...input, models };
  }
  return {
    baseUrl: input.base_url,
    apiKey: input.api_key,
    model: input.model,
    models: parseModelsJson(input.models_json ?? null, input.model),
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
      models: [LOCAL_LLM_DEFAULTS.model],
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
  const models = normalizeModels(config);
  await fetch("/api/local-config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      base_url: config.baseUrl,
      api_key: config.apiKey,
      model: config.model,
      models_json: JSON.stringify(models),
    }),
  });
}
