import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface CreateSessionPayload {
  action: "create";
  playerCount: number;
  difficulty?: string;
  usedCustomKey: boolean;
  modelUsed?: string;
}

interface UpdateSessionPayload {
  action: "update";
  sessionId: string;
}

type GameSessionPayload = CreateSessionPayload | UpdateSessionPayload;

function generateSessionId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(request: Request) {
  let payload: GameSessionPayload;
  try {
    payload = (await request.json()) as GameSessionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (payload.action === "create") {
    return NextResponse.json({ success: true, sessionId: generateSessionId() });
  }

  if (payload.action === "update") {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
