# Merge Upstream Commits Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge the latest two commits from `upstream/main` into this fork and resolve conflicts without regressing local prompt context additions.

**Architecture:** Use an isolated worktree branch, merge `upstream/main`, resolve conflicts by preserving both local phase summaries and upstream vote fallback + VoteResultCard UI, then run smoke tests.

**Tech Stack:** git, pnpm, Next.js/React, TypeScript.

### Task 1: Sync and inspect upstream

**Files:**
- Modify: none

**Step 1: Fetch upstream**

Run: `git fetch upstream`

Expected: refs updated without errors.

**Step 2: Confirm the two upstream commits**

Run: `git log -2 --stat HEAD..upstream/main`

Expected: shows VoteResultCard change and `public/group.png` update.

**Step 3: Identify merge-base (for diffs)**

Run: `git merge-base HEAD upstream/main`

Expected: SHA printed.

**Step 4: Check local-only changes**

Run: `git diff --name-only <merge-base> HEAD`

Expected: local changes limited to `src/lib/prompt-utils.ts`.

### Task 2: Merge upstream/main

**Files:**
- Modify: none (unless conflicts)

**Step 1: Merge upstream**

Run: `git merge upstream/main`

Expected: merge completes or conflict list appears.

**Step 2: If conflicts, list them**

Run: `git status --porcelain`

Expected: conflict entries like `UU path/to/file`.

### Task 3: Resolve prompt-utils conflicts (if any)

**Files:**
- Modify: `src/lib/prompt-utils.ts`

**Step 1: Preserve local phase summaries**

Ensure `buildPhaseSummariesSection(state)` remains defined and returns the `<phase_summaries>` blocks.

**Step 2: Preserve upstream vote fallback**

Ensure `buildGameContext` keeps the `sortedTargets` fallback that emits vote info even when `dayHistory` is missing.

Expected: both features present; no conflict markers.

### Task 4: Keep VoteResultCard rendering

**Files:**
- Modify: `src/components/game/DialogArea.tsx`

**Step 1: Keep VoteResultCard import**

Ensure `VoteResultCard` is imported from `@/components/game/VoteResultCard`.

**Step 2: Keep JSON parse rendering**

Ensure the `[VOTE_RESULT]` branch parses JSON and renders `<VoteResultCard ... />`, with try/catch fallback to `null` on parse error.

### Task 5: Update group QR asset

**Files:**
- Modify: `public/group.png`

**Step 1: Verify asset updated**

If Git LFS is required, install `git-lfs` and re-checkout the file before confirming the update.

### Task 6: Verify

**Step 1: Run smoke tests**

Run: `pnpm test`

Expected: exit code 0.

### Task 7: Commit (if desired)

**Step 1: Stage changes**

Run: `git add -A`

**Step 2: Commit merge**

Run: `git commit -m "merge: upstream/main (vote result card + group qr)"`
