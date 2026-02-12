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
