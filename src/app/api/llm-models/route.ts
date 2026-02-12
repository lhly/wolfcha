import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ModelsResponse = {
  data?: Array<{ id?: string; model?: string }>;
  models?: string[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { base_url?: string; api_key?: string };
    const baseUrl = (body.base_url ?? "").trim().replace(/\/$/, "");
    const apiKey = (body.api_key ?? "").trim();

    if (!baseUrl || !apiKey) {
      return NextResponse.json({ ok: false, error: "Missing base_url or api_key" }, { status: 400 });
    }

    const response = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: errorText || `Request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const json = (await response.json()) as ModelsResponse;
    const models = Array.isArray(json?.data)
      ? json.data
          .map((item) => item?.id ?? item?.model ?? "")
          .filter((item): item is string => Boolean(item))
      : Array.isArray(json?.models)
        ? json.models.filter((item): item is string => typeof item === "string" && item.trim())
        : [];

    return NextResponse.json({ ok: true, models });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
