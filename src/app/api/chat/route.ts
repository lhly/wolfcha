import { NextRequest, NextResponse } from "next/server";

const API_TIMEOUT_MS = 60000;

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

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing BaseUrl" }, { status: 400 });
  }

  if (!payload.model || !payload.messages) {
    return NextResponse.json({ error: "Missing model or messages" }, { status: 400 });
  }

  const body = JSON.stringify(stripProxyFields(payload));
  const response = await fetchWithTimeout(targetUrl, {
    method: "POST",
    headers: buildHeaders(resolvedApiKey),
    body,
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

    if (requests.some((r) => r.stream)) {
      return NextResponse.json({ error: "Batch request does not support stream=true" }, { status: 400 });
    }

    const results = await Promise.all(
      requests.map(async (payload) => {
        const resolvedBaseUrl = baseUrl ?? payload.baseUrl ?? "";
        const resolvedApiKey = apiKey ?? payload.apiKey ?? "";
        const targetUrl = normalizeChatCompletionsUrl(resolvedBaseUrl);
        if (!targetUrl) {
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
            return { ok: false, status: response.status, error: text || "Upstream error" };
          }
          const data = JSON.parse(text);
          return { ok: true, data };
        } catch (error) {
          return { ok: false, status: 500, error: String(error ?? "Unknown error") };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: String(error ?? "Unknown error") }, { status: 500 });
  }
}
