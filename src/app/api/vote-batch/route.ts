import { NextRequest, NextResponse } from "next/server";

type VoteBatchRequest = {
  voterId: string;
  model: string;
  messages: unknown[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  reasoning?: { enabled: boolean; effort?: "minimal" | "low" | "medium" | "high"; max_tokens?: number };
  reasoning_effort?: "minimal" | "low" | "medium" | "high";
  response_format?: unknown;
};

type VoteBatchBody = {
  baseUrl?: string;
  apiKey?: string;
  requests?: VoteBatchRequest[];
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VoteBatchBody;
    const requests = Array.isArray(body?.requests) ? body.requests : [];
    if (requests.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const origin = request.nextUrl.origin;
    const chatRequests = requests.map(({ voterId: _voterId, ...payload }) => payload);

    const chatResponse = await fetch(`${origin}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl: body.baseUrl,
        apiKey: body.apiKey,
        requests: chatRequests,
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text().catch(() => "");
      return NextResponse.json(
        { error: errorText || "Vote batch request failed" },
        { status: chatResponse.status }
      );
    }

    const data = await chatResponse.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    const enriched = results.map((result: unknown, index: number) => ({
      ...(result && typeof result === "object" ? result : {}),
      voterId: requests[index]?.voterId ?? "",
    }));

    return NextResponse.json({ results: enriched });
  } catch (error) {
    return NextResponse.json(
      { error: String(error ?? "Unknown error") },
      { status: 500 }
    );
  }
}
