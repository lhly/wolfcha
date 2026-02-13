import test from "node:test";
import assert from "node:assert/strict";
import { generateCompletion } from "../src/lib/llm";
import { initLlmConfig } from "../src/lib/llm-config";

function setupConfig() {
  initLlmConfig({
    baseUrl: "http://example.com",
    apiKey: "test-key",
    model: "test-model",
    models: ["test-model"],
  });
}

function createSseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

test("generateCompletion prefers stream when SSE is available", async () => {
  setupConfig();
  const calls: Array<{ stream?: boolean }> = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (_input, init) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ stream: body.stream });
    return createSseResponse([
      "data: {\"choices\":[{\"delta\":{\"content\":\"he\"}}]}\n",
      "data: {\"choices\":[{\"delta\":{\"content\":\"llo\"}}]}\n",
      "data: [DONE]\n",
    ]);
  };

  try {
    const result = await generateCompletion({
      model: "test-model",
      messages: [{ role: "user", content: "hi" }],
    });

    assert.equal(result.content, "hello");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].stream, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("generateCompletion falls back to non-stream when stream is not SSE", async () => {
  setupConfig();
  const calls: Array<{ stream?: boolean }> = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (_input, init) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ stream: body.stream });

    if (calls.length === 1) {
      const json = JSON.stringify({
        choices: [{ message: { role: "assistant", content: "ignored" }, finish_reason: "stop" }],
      });
      return new Response(json, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    const json = JSON.stringify({
      choices: [{ message: { role: "assistant", content: "fallback" }, finish_reason: "stop" }],
    });
    return new Response(json, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const result = await generateCompletion({
      model: "test-model",
      messages: [{ role: "user", content: "hi" }],
    });

    assert.equal(result.content, "fallback");
    assert.equal(calls.length, 2);
    assert.equal(calls[0].stream, true);
    assert.notEqual(calls[1].stream, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
