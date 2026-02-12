# Public Claims Memory Design

**Goal:** Preserve public role claims (e.g., seer checks, witch saves) across days without treating them as ground truth.

## Problem
- Day speech prompts only include today's transcript (2000 chars).
- Cross-day memory relies on LLM summaries that may omit key claims.
- If claims are injected as facts, fake-claims create "thought seal" behavior.

## Solution Overview
Introduce a **Public Claims Ledger** stored in game state, populated by a mixed extraction approach:
- LLM JSON extraction from daily transcripts/summaries
- Lightweight rule-based conflict/duplication handling

Claims are injected into prompts as **unverified evidence**, explicitly labeled as potentially false.

## Data Model
```
PublicClaim {
  id: string
  day: number
  phase: string
  speakerSeat: number
  claimType: 'seer_claim' | 'seer_check' | 'witch_save' | 'witch_poison' | 'guard_protect' | 'alignment_statement' | 'other'
  targetSeat?: number
  content: string
  status: 'unverified' | 'contested' | 'corroborated' | 'disproved'
  source: 'summary' | 'regex' | 'manual'
}
```
Stored as `GameState.publicClaims?: PublicClaim[]`.

## Extraction Flow
1) Daily summary generated (existing flow).
2) Extract public claims for that day via summary model (JSON output).
3) Merge into `publicClaims`:
   - dedupe same-day same-speaker same-claimType
   - mark `contested` if multiple conflicting role-claims
   - default `unverified` for all new claims
4) Inject `<public_claims>` block into `buildGameContext`.

## Prompt Injection
- Insert `<public_claims>` after `<history>`.
- Each line includes a disclaimer, e.g.:
  "Public claim, unverified: Seat 1 said Seat 5 is good (may be fake-claim)."

## Summary Prompt Tweaks
Update daily summary prompt to:
- Require recording all role claims/checks with seat numbers.
- Add explicit instruction: "Claims are not verified facts."

## Failure Handling
- If JSON parse fails, skip claim update (do not erase existing ledger).
- If extraction returns empty list, keep prior claims.

## Expected Outcome
- The model remembers both "gold" and "silver" water claims.
- It references them with uncertainty, avoiding thought-seal behavior.

