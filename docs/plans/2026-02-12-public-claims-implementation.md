# Public Claims Memory Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a public-claims ledger and summary prompt tweaks so AI remembers claims across days without treating them as facts.

**Architecture:** Store structured claims in `GameState.publicClaims`, extract claims via summary-model JSON, merge with conflict tagging, and inject a `<public_claims>` section into prompt context with explicit uncertainty language.

**Tech Stack:** Next.js, TypeScript, node:test (via tsx), i18n JSON prompts.

---

### Task 1: Add test harness + public claims core module

**Files:**
- Modify: `package.json`
- Create: `tests/public-claims.test.ts`
- Create: `src/lib/public-claims.ts`

**Step 1: Write the failing test (merge + conflict)**

Create `tests/public-claims.test.ts`:
```ts
import test from "node:test";
import assert from "node:assert/strict";
import { mergePublicClaims, type PublicClaim } from "../src/lib/public-claims";

test("mergePublicClaims dedupes same-speaker same-claim and marks contested role-claims", () => {
  const base: PublicClaim[] = [
    { id: "a", day: 1, phase: "DAY_SPEECH", speakerSeat: 0, claimType: "role_claim", role: "Seer", content: "Seat 1 claims Seer", status: "unverified", source: "summary" },
  ];
  const incoming: PublicClaim[] = [
    { id: "b", day: 1, phase: "DAY_SPEECH", speakerSeat: 1, claimType: "role_claim", role: "Seer", content: "Seat 2 claims Seer", status: "unverified", source: "summary" },
    { id: "c", day: 1, phase: "DAY_SPEECH", speakerSeat: 0, claimType: "role_claim", role: "Seer", content: "Seat 1 claims Seer", status: "unverified", source: "summary" },
  ];

  const merged = mergePublicClaims(base, incoming);

  assert.equal(merged.length, 2);
  const statuses = merged.map((c) => c.status);
  assert.ok(statuses.every((s) => s === "contested"));
});
```

**Step 2: Run test to verify it fails**

Add test runner to `package.json`:
```json
"test:unit": "tsx --test"
```
Add dev dependency:
```json
"tsx": "^4.19.2"
```

Run:
```
npm install
npm run test:unit -- tests/public-claims.test.ts
```
Expected: FAIL (module/functions missing).

**Step 3: Write minimal implementation**

Create `src/lib/public-claims.ts` with:
```ts
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
export type PublicRole = "Seer" | "Witch" | "Guard" | "Hunter" | "Villager" | "Werewolf" | "Unknown";

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
  // mark contested if multiple role_claim of same role exist in same day
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
```

**Step 4: Run test to verify it passes**

Run:
```
npm run test:unit -- tests/public-claims.test.ts
```
Expected: PASS.

**Step 5: Commit**

```
git add package.json tests/public-claims.test.ts src/lib/public-claims.ts
git commit -m "feat: add public claims core utilities"
```

---

### Task 2: Render public claims section for prompts

**Files:**
- Modify: `src/lib/public-claims.ts`
- Modify: `src/lib/prompt-utils.ts`
- Modify: `tests/public-claims.test.ts`

**Step 1: Write the failing test (render + disclaimer)**

Add test:
```ts
import { renderPublicClaimsSection } from "../src/lib/public-claims";

test("renderPublicClaimsSection emits disclaimer and limits items", () => {
  const claims = Array.from({ length: 3 }).map((_, i) => ({
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
  assert.equal(out.split("\\n").filter((l) => l.startsWith("- ")).length, 2);
});
```

**Step 2: Run test to verify it fails**

```
npm run test:unit -- tests/public-claims.test.ts
```
Expected: FAIL (render function missing).

**Step 3: Write minimal implementation**

Extend `src/lib/public-claims.ts`:
```ts
export function renderPublicClaimsSection(
  claims: PublicClaim[],
  options: { limit: number; header: string; disclaimer: string; seatLabel: (seat: number) => string }
): string {
  const { limit, header, disclaimer, seatLabel } = options;
  const list = claims.slice(-limit);
  if (list.length === 0) return "";
  const lines = list.map((c) => `- ${seatLabel(c.speakerSeat + 1)}: ${c.content} (${c.status})`);
  return `<public_claims>\\n${header}\\n${disclaimer}\\n${lines.join(\"\\n\")}\\n</public_claims>`;
}
```

**Step 4: Wire into `buildGameContext`**

In `src/lib/prompt-utils.ts`, import `renderPublicClaimsSection`, read i18n strings, and append the section after `<history>`.

**Step 5: Run test to verify it passes**

```
npm run test:unit -- tests/public-claims.test.ts
```
Expected: PASS.

**Step 6: Commit**

```
git add src/lib/public-claims.ts src/lib/prompt-utils.ts tests/public-claims.test.ts
git commit -m "feat: render public claims section"
```

---

### Task 3: Add extraction prompt + parser and integrate with daily summary

**Files:**
- Modify: `src/lib/game-master.ts`
- Modify: `src/hooks/useGameLogic.ts`
- Modify: `src/i18n/messages/en.json`
- Modify: `src/i18n/messages/zh.json`
- Modify: `src/types/game.ts`
- Modify: `tests/public-claims.test.ts`

**Step 1: Write failing test (parse JSON response)**

Add test:
```ts
import { parsePublicClaimsResponse } from "../src/lib/public-claims";

test("parsePublicClaimsResponse accepts claims list and defaults status", () => {
  const raw = '{\"claims\":[{\"day\":1,\"phase\":\"DAY_SPEECH\",\"speakerSeat\":1,\"claimType\":\"seer_check\",\"targetSeat\":5,\"content\":\"Seat 2 said Seat 6 is good\"}]}';
  const parsed = parsePublicClaimsResponse(raw);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].status, \"unverified\");
});
```

**Step 2: Run test to verify it fails**

```
npm run test:unit -- tests/public-claims.test.ts
```
Expected: FAIL (parser missing).

**Step 3: Implement parser**

Add to `src/lib/public-claims.ts`:
```ts
export function parsePublicClaimsResponse(raw: string): PublicClaim[] {
  const json = JSON.parse(raw);
  const claims = Array.isArray(json?.claims) ? json.claims : [];
  return claims
    .filter((c: any) => typeof c?.day === "number" && typeof c?.speakerSeat === "number")
    .map((c: any) => ({
      id: crypto.randomUUID(),
      day: c.day,
      phase: String(c.phase ?? ""),
      speakerSeat: c.speakerSeat - 1, // input is 1-based
      claimType: c.claimType ?? "other",
      role: c.role ?? "Unknown",
      targetSeat: typeof c.targetSeat === "number" ? c.targetSeat - 1 : undefined,
      content: String(c.content ?? "").trim(),
      status: (c.status as PublicClaimStatus) ?? "unverified",
      source: "summary",
    }));
}
```

**Step 4: Add publicClaims to GameState + initial state**

Update `src/types/game.ts`:
```ts
publicClaims?: PublicClaim[];
```
Update `createInitialGameState` in `src/lib/game-master.ts` to set `publicClaims: []`.

**Step 5: Add extraction in `game-master.ts`**

Create `generatePublicClaimsFromDay(state, dayMessages)` that:\n
- builds a transcript (same as daily summary)\n
- calls `generateCompletion` with new i18n prompt\n
- parses with `parsePublicClaimsResponse`\n
- returns `PublicClaim[]` or empty list on failure

**Step 6: Integrate in `useGameLogic`**

After daily summary generation, call `generatePublicClaimsFromDay` and merge via `mergePublicClaims`, then set `state.publicClaims`.

**Step 7: Update i18n prompts**

In `en.json` and `zh.json`:\n
- Add `gameMaster.publicClaims.systemPrompt` and `.userPrompt` with JSON schema\n
- Add disclaimer text for `publicClaims`\n
- Update `gameMaster.dailySummary.systemPrompt` to say claims are unverified\n

**Step 8: Run tests to verify it passes**

```
npm run test:unit -- tests/public-claims.test.ts
```

**Step 9: Commit**

```
git add src/lib/game-master.ts src/hooks/useGameLogic.ts src/i18n/messages/en.json src/i18n/messages/zh.json src/types/game.ts src/lib/public-claims.ts tests/public-claims.test.ts
git commit -m "feat: extract and persist public claims"
```

---

### Task 4: Verification

**Step 1: Run unit tests**
```
npm run test:unit
```
Expected: PASS.

**Step 2: Run smoke tests**
```
npm test
```
Expected: PASS (Smoke test passed).

**Step 3: Commit plan follow-up if needed**
```
git status -s
```

