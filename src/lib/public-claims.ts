import type {
  PublicClaim,
  PublicClaimStatus,
  PublicClaimType,
  PublicClaimSource,
  PublicRole,
} from "@/types/public-claims";

export type {
  PublicClaim,
  PublicClaimStatus,
  PublicClaimType,
  PublicClaimSource,
  PublicRole,
} from "@/types/public-claims";

const claimKey = (c: PublicClaim) =>
  `${c.day}|${c.phase}|${c.speakerSeat}|${c.claimType}|${c.role ?? ""}|${c.targetSeat ?? ""}`;

export function mergePublicClaims(existing: PublicClaim[], incoming: PublicClaim[]): PublicClaim[] {
  const map = new Map<string, PublicClaim>();
  for (const c of existing) map.set(claimKey(c), c);
  for (const c of incoming) {
    const key = claimKey(c);
    if (!map.has(key)) map.set(key, c);
  }
  const merged = Array.from(map.values());

  // Mark contested if multiple role_claim of same role exist in same day.
  const byDayRole = new Map<string, PublicClaim[]>();
  for (const c of merged) {
    if (c.claimType !== "role_claim") continue;
    const k = `${c.day}|${c.role ?? "Unknown"}`;
    const arr = byDayRole.get(k) ?? [];
    arr.push(c);
    byDayRole.set(k, arr);
  }
  for (const arr of byDayRole.values()) {
    if (arr.length > 1) arr.forEach((c) => (c.status = "contested"));
  }

  return merged;
}

export function mergePublicClaimsSafe(
  existing: PublicClaim[] | undefined,
  incoming: PublicClaim[]
): PublicClaim[] {
  return mergePublicClaims(existing ?? [], incoming);
}

const makeId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function parsePublicClaimsResponse(raw: string): PublicClaim[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const claims = Array.isArray((parsed as any)?.claims) ? (parsed as any).claims : [];
  return claims
    .filter((c: any) => typeof c?.day === "number" && typeof c?.speakerSeat === "number")
    .map((c: any): PublicClaim => {
      const speakerSeat = c.speakerSeat - 1;
      const targetSeat =
        typeof c.targetSeat === "number" ? c.targetSeat - 1 : undefined;
      const status = (c.status as PublicClaimStatus) ?? "unverified";
      const role = (c.role as PublicRole) ?? "Unknown";
      const content = String(c.content ?? "").trim();
      return {
        id: makeId(),
        day: c.day,
        phase: String(c.phase ?? ""),
        speakerSeat,
        claimType: (c.claimType as PublicClaimType) ?? "other",
        role,
        targetSeat,
        content,
        status,
        source: "summary",
      };
    })
    .filter((c) => c.content.length > 0 && Number.isFinite(c.speakerSeat));
}

export function renderPublicClaimsSection(
  claims: PublicClaim[],
  options: {
    limit: number;
    header: string;
    disclaimer: string;
    seatLabel: (seat: number) => string;
  }
): string {
  const { limit, header, disclaimer, seatLabel } = options;
  const list = claims.slice(-limit);
  if (list.length === 0) return "";
  const lines = list.map((c) => `- ${seatLabel(c.speakerSeat + 1)}: ${c.content} (${c.status})`);
  return `<public_claims>\n${header}\n${disclaimer}\n${lines.join("\n")}\n</public_claims>`;
}
