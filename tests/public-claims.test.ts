import test from "node:test";
import assert from "node:assert/strict";
import { mergePublicClaims, type PublicClaim } from "../src/lib/public-claims";

test("mergePublicClaims dedupes same-speaker same-claim and marks contested role-claims", () => {
  const base: PublicClaim[] = [
    {
      id: "a",
      day: 1,
      phase: "DAY_SPEECH",
      speakerSeat: 0,
      claimType: "role_claim",
      role: "Seer",
      content: "Seat 1 claims Seer",
      status: "unverified",
      source: "summary",
    },
  ];
  const incoming: PublicClaim[] = [
    {
      id: "b",
      day: 1,
      phase: "DAY_SPEECH",
      speakerSeat: 1,
      claimType: "role_claim",
      role: "Seer",
      content: "Seat 2 claims Seer",
      status: "unverified",
      source: "summary",
    },
    {
      id: "c",
      day: 1,
      phase: "DAY_SPEECH",
      speakerSeat: 0,
      claimType: "role_claim",
      role: "Seer",
      content: "Seat 1 claims Seer",
      status: "unverified",
      source: "summary",
    },
  ];

  const merged = mergePublicClaims(base, incoming);

  assert.equal(merged.length, 2);
  const statuses = merged.map((c) => c.status);
  assert.ok(statuses.every((s) => s === "contested"));
});
