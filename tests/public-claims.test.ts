import test from "node:test";
import assert from "node:assert/strict";
import { mergePublicClaims, renderPublicClaimsSection, type PublicClaim } from "../src/lib/public-claims";

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

test("renderPublicClaimsSection emits disclaimer and limits items", () => {
  const claims: PublicClaim[] = Array.from({ length: 3 }).map((_, i) => ({
    id: String(i),
    day: 1,
    phase: "DAY_SPEECH",
    speakerSeat: i,
    claimType: "alignment_statement",
    content: `Seat ${i + 1} said X`,
    status: "unverified",
    source: "summary",
  }));
  const out = renderPublicClaimsSection(claims, {
    limit: 2,
    header: "Public claims",
    disclaimer: "Claims are unverified",
    seatLabel: (n) => `Seat ${n}`,
  });
  assert.ok(out.includes("Public claims"));
  assert.ok(out.includes("Claims are unverified"));
  assert.equal(out.split("\n").filter((l) => l.startsWith("- ")).length, 2);
});
