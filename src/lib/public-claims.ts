export type PublicClaimStatus = "unverified" | "contested" | "corroborated" | "disproved";
export type PublicClaimType =
  | "role_claim"
  | "seer_check"
  | "witch_save"
  | "witch_poison"
  | "guard_protect"
  | "alignment_statement"
  | "other";
export type PublicClaimSource = "summary" | "regex" | "manual";
export type PublicRole =
  | "Seer"
  | "Witch"
  | "Guard"
  | "Hunter"
  | "Villager"
  | "Werewolf"
  | "Unknown";

export type PublicClaim = {
  id: string;
  day: number;
  phase: string;
  speakerSeat: number;
  claimType: PublicClaimType;
  role?: PublicRole;
  targetSeat?: number;
  content: string;
  status: PublicClaimStatus;
  source: PublicClaimSource;
};

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
