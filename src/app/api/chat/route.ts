import { NextRequest, NextResponse } from "next/server";
import { getChatApiTimeoutMs } from "@/lib/chat-timeout";

const API_TIMEOUT_MS = getChatApiTimeoutMs();

function createRequestId(): string {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeHost(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

type OpenAIChatRequest = {
  baseUrl?: string;
  apiKey?: string;
  model: string;
  messages: unknown[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: unknown;
  reasoning?: unknown;
  reasoning_effort?: unknown;
  [key: string]: unknown;
};

type BatchRequest = {
  baseUrl?: string;
  apiKey?: string;
  requests: OpenAIChatRequest[];
};

function normalizeChatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed;
  if (/\/v1$/i.test(trimmed)) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
}

function buildHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey && apiKey.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }
  return headers;
}

function stripProxyFields(payload: OpenAIChatRequest): Record<string, unknown> {
  const { baseUrl: _baseUrl, apiKey: _apiKey, ...rest } = payload;
  return rest;
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function handleSingleRequest(payload: OpenAIChatRequest, baseUrl?: string, apiKey?: string) {
  const resolvedBaseUrl = baseUrl ?? payload.baseUrl ?? "";
  const resolvedApiKey = apiKey ?? payload.apiKey ?? "";
  const targetUrl = normalizeChatCompletionsUrl(resolvedBaseUrl);
  const requestId = createRequestId();
  const startedAt = Date.now();
  const messageCount = Array.isArray(payload.messages) ? payload.messages.length : undefined;

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing BaseUrl" }, { status: 400 });
  }

  if (!payload.model || !payload.messages) {
    return NextResponse.json({ error: "Missing model or messages" }, { status: 400 });
  }

  console.log("[api/chat] request", {
    requestId,
    model: payload.model,
    stream: !!payload.stream,
    messageCount,
    baseUrl: safeHost(targetUrl),
  });

  const body = JSON.stringify(stripProxyFields(payload));
  let response: Response;
  try {
    response = await fetchWithTimeout(targetUrl, {
      method: "POST",
      headers: buildHeaders(resolvedApiKey),
      body,
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const errorMessage = error instanceof Error ? error.message : String(error ?? "Unknown error");
    console.error("[api/chat] fetch error", {
      requestId,
      model: payload.model,
      durationMs,
      errorName,
      errorMessage,
      baseUrl: safeHost(targetUrl),
    });
    throw error;
  }

  const durationMs = Date.now() - startedAt;
  console.log("[api/chat] response", {
    requestId,
    status: response.status,
    durationMs,
    stream: !!payload.stream,
  });

  if (payload.stream) {
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "text/event-stream",
        "Cache-Control": "no-store",
      },
    });
  }

  const text = await response.text();
  if (!response.ok) {
    console.error("[api/chat] upstream error", {
      requestId,
      status: response.status,
      durationMs,
      errorSnippet: text.slice(0, 600),
    });
    return NextResponse.json({ error: text || "Upstream error" }, { status: response.status });
  }

  return new NextResponse(text, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OpenAIChatRequest | BatchRequest;
    const isBatch = Array.isArray((body as BatchRequest)?.requests);

    if (!isBatch) {
      return await handleSingleRequest(body as OpenAIChatRequest);
    }

    const { baseUrl, apiKey, requests } = body as BatchRequest;
    if (!requests || requests.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const batchId = createRequestId();
    const batchStartedAt = Date.now();
    console.log("[api/chat] batch request", {
      batchId,
      count: requests.length,
      baseUrl: baseUrl ? safeHost(baseUrl) : undefined,
    });

    if (requests.some((r) => r.stream)) {
      return NextResponse.json({ error: "Batch request does not support stream=true" }, { status: 400 });
    }

    const results = await Promise.all(
      requests.map(async (payload, index) => {
        const resolvedBaseUrl = baseUrl ?? payload.baseUrl ?? "";
        const resolvedApiKey = apiKey ?? payload.apiKey ?? "";
        const targetUrl = normalizeChatCompletionsUrl(resolvedBaseUrl);
        if (!targetUrl) {
          console.warn("[api/chat] batch missing baseUrl", { batchId, index });
          return { ok: false, status: 400, error: "Missing BaseUrl" };
        }

        try {
          const response = await fetchWithTimeout(targetUrl, {
            method: "POST",
            headers: buildHeaders(resolvedApiKey),
            body: JSON.stringify(stripProxyFields(payload)),
          });
          const text = await response.text();
          if (!response.ok) {
            console.error("[api/chat] batch upstream error", {
              batchId,
              index,
              status: response.status,
              errorSnippet: text.slice(0, 600),
            });
            return { ok: false, status: response.status, error: text || "Upstream error" };
          }
          const data = JSON.parse(text);
          return { ok: true, data };
        } catch (error) {
          const errorName = error instanceof Error ? error.name : "UnknownError";
          const errorMessage = error instanceof Error ? error.message : String(error ?? "Unknown error");
          console.error("[api/chat] batch fetch error", {
            batchId,
            index,
            errorName,
            errorMessage,
          });
          return { ok: false, status: 500, error: String(error ?? "Unknown error") };
        }
      })
    );

    console.log("[api/chat] batch response", {
      batchId,
      count: requests.length,
      durationMs: Date.now() - batchStartedAt,
    });

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: String(error ?? "Unknown error") }, { status: 500 });
  }
}
