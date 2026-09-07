# GrantGate Public Proof and Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a faster anonymous GrantGate verification experience that proves both `ACCEPTED` and fail-safe `UNRESOLVED` outcomes plus terminal replay protection from live Studionet state.

**Architecture:** Keep the intentionally frozen contract unchanged. Add a typed promotion manifest that contains identifiers and expected projections but no verdict fixtures, read every promoted milestone through the existing fail-closed contract parser, and render a proof gallery whose claims disappear on mismatch. Split routes and wallet-triggered dependencies so the release no longer ships one monolithic application chunk.

**Tech Stack:** React 18, TypeScript, TanStack Query, React Router 6, Vite 5, Vitest, Testing Library, genlayer-js, pnpm 10.

## Global Constraints

- Contract `0xA6eE55C2214274474546d8259C893d4540742342` remains `INTENTIONALLY_FROZEN`; do not edit `packages/contracts/grantgate.py` or deployment manifests.
- Network remains Studionet Preview; simulated GEN must never be described as production value.
- Promoted outcomes come only from parsed live `get_milestone` readback; metadata may select a record but may not supply its displayed verdict.
- Expected-state mismatch, malformed data, and RPC failure must fail closed without fixture substitution.
- Existing wallet authorization, transaction finality, execution-result, and readback checks must remain intact.
- Use TDD for every behavior change and preserve the full repository gate.
- GitHub push and Vercel production deployment require action-time identity confirmation.

---

## File structure

- `apps/web/src/lib/liveProof.ts` — immutable promotion identifiers and proof-projection validation.
- `apps/web/src/lib/liveProof.test.ts` — projection and mismatch behavior tests.
- `apps/web/src/components/LiveProof.tsx` — live accepted/unresolved/replay gallery.
- `apps/web/src/components/LiveProof.test.tsx` — anonymous, partial-failure, mismatch, and retry UI tests.
- `apps/web/src/App.tsx` — route-level lazy boundaries and route fallback.
- `apps/web/src/App.test.tsx` — route behavior through lazy boundaries.
- `apps/web/src/lib/wallet.tsx` — dynamically load wallet network operations only on connection/disconnection.
- `apps/web/src/lib/wallet.test.tsx` — wallet-loading regression behavior.
- `apps/web/vite.config.ts` — stable vendor chunk groups for cacheable build output.
- `apps/web/src/index.css` — responsive proof-gallery and loading-fallback styles.
- `README.md`, `CHANGELOG.md`, `docs/live-evidence.md`, `docs/proof-matrix.md` — milestone evidence and truthful release record.

---

### Task 1: Define fail-closed promoted proof projections

**Files:**
- Create: `apps/web/src/lib/liveProof.test.ts`
- Modify: `apps/web/src/lib/liveProof.ts`

**Interfaces:**
- Consumes: `Milestone`, `MilestoneStatus`, and `CriterionResult` from `@grantgate/shared`.
- Produces: `LIVE_PROOF_SPECS`, `LIVE_REVIEW_TX`, `LIVE_REPLAY_TX`, `matchLiveProof(spec, milestone): LiveProofMatch`.

- [ ] **Step 1: Write the failing projection tests**

Name the break: a changed or malformed live record must not retain a promoted proof label.

Create tests using hand-written complete `Milestone` records. Assert:

```ts
expect(matchLiveProof(LIVE_PROOF_SPECS.accepted, accepted)).toEqual({ ok: true });
expect(matchLiveProof(LIVE_PROOF_SPECS.unresolved, unresolved)).toEqual({ ok: true });
expect(matchLiveProof(LIVE_PROOF_SPECS.accepted, { ...accepted, status: "UNRESOLVED" })).toEqual({
  ok: false,
  reason: "Expected ACCEPTED with MET, received UNRESOLVED with MET.",
});
expect(matchLiveProof(LIVE_PROOF_SPECS.unresolved, { ...unresolved, criteriaResults: ["MET"] })).toEqual({
  ok: false,
  reason: "Expected UNRESOLVED with INSUFFICIENT, received UNRESOLVED with MET.",
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
pnpm --filter @grantgate/web test -- src/lib/liveProof.test.ts
```

Expected: FAIL because `LIVE_PROOF_SPECS` and `matchLiveProof` do not exist.

- [ ] **Step 3: Implement the minimal typed manifest and matcher**

Define:

```ts
export interface LiveProofSpec {
  id: number;
  label: string;
  expectedStatus: MilestoneStatus;
  expectedResults: CriterionResult[];
  transactionHash?: `0x${string}`;
}

export const LIVE_PROOF_SPECS = {
  accepted: {
    id: 7,
    label: "Accepted evidence",
    expectedStatus: "ACCEPTED",
    expectedResults: ["MET"],
    transactionHash: LIVE_REVIEW_TX,
  },
  unresolved: {
    id: 3,
    label: "Fail-safe uncertainty",
    expectedStatus: "UNRESOLVED",
    expectedResults: ["INSUFFICIENT"],
  },
} as const satisfies Record<string, LiveProofSpec>;
```

Resolve the exact milestone `3` review transaction from current fixed evidence or the live Explorer. If the repository contains no fixed transaction for milestone `3`, keep its transaction link absent rather than inventing one.

`matchLiveProof` must compare milestone id, status, and the complete ordered criterion vector. Return only `{ ok: true }` or `{ ok: false, reason }`; it must never mutate or synthesize a `Milestone`.

- [ ] **Step 4: Verify GREEN**

Run the focused test again. Expected: all projection tests pass.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/lib/liveProof.ts apps/web/src/lib/liveProof.test.ts
git commit -m "feat(web): define live proof projections"
```

---

### Task 2: Render accepted, unresolved, and replay evidence

**Files:**
- Modify: `apps/web/src/components/LiveProof.test.tsx`
- Modify: `apps/web/src/components/LiveProof.tsx`
- Modify: `apps/web/src/index.css`

**Interfaces:**
- Consumes: `LIVE_PROOF_SPECS`, `matchLiveProof`, two `useMilestone(id)` queries, Explorer URL helpers.
- Produces: a wallet-free proof gallery with per-proof loading/error/mismatch state and a retry-all control.

- [ ] **Step 1: Replace the single-record test setup with id-aware live query fixtures**

Name the break: either promoted outcome disappearing, being replaced by fixture state, or blocking the other outcome when one read fails.

Mock `useMilestone(id)` with a map keyed by `3` and `7`. Add tests that assert:

```tsx
expect(screen.getByRole("heading", { name: /accepted evidence/i })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: /fail-safe uncertainty/i })).toBeInTheDocument();
expect(screen.getByText("ACCEPTED")).toBeInTheDocument();
expect(screen.getByText("UNRESOLVED")).toBeInTheDocument();
expect(screen.getByText("INSUFFICIENT")).toBeInTheDocument();
expect(screen.getByRole("link", { name: /rejected replay/i })).toHaveAttribute(
  "href",
  expect.stringContaining("0xfc62b8c2"),
);
```

Also cover:

- milestone `3` RPC failure leaves milestone `7` visible and labels only the unresolved proof unavailable;
- an unexpected milestone `3` status renders `Proof state changed` and never renders its expected `UNRESOLVED` claim;
- retry calls both query `refetch` functions;
- neither branch renders a wallet connection control.

- [ ] **Step 2: Run the component test and verify RED**

```powershell
pnpm --filter @grantgate/web test -- src/components/LiveProof.test.tsx
```

Expected: FAIL because the component still reads and renders one milestone.

- [ ] **Step 3: Implement independent proof cards**

Call `useMilestone` exactly once for each fixed id. Render a shared internal `ProofCard` for each query. A successful card must render values from `query.data`, then call `matchLiveProof`; a mismatch card must show the returned reason and no status badge for the expected claim.

Add a third replay card that explains the rejected replay only while the accepted readback still matches evidence version `1`, review round `1`, and status `ACCEPTED`. Link to the fixed replay transaction and milestone `7`. Do not claim that the UI independently parsed the Explorer transaction; phrase it as a linked transaction paired with unchanged authoritative readback.

The retry button calls both `refetch` functions with `Promise.all`. Disable it while either query is fetching.

- [ ] **Step 4: Add responsive gallery styling**

Use the existing dark proof visual language. Add a three-column desktop grid, two-column tablet layout, and one-column mobile layout. Preserve visible focus states, semantic headings, and reduced-motion behavior.

- [ ] **Step 5: Verify GREEN and neighboring behavior**

```powershell
pnpm --filter @grantgate/web test -- src/components/LiveProof.test.tsx src/components/HowToTry.test.tsx src/pages/MilestonePage.test.tsx
```

Expected: gallery tests and existing anonymous-reader tests pass.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/components/LiveProof.tsx apps/web/src/components/LiveProof.test.tsx apps/web/src/index.css
git commit -m "feat(web): show accepted and unresolved live proofs"
```

---

### Task 3: Split public routes and wallet-triggered work

**Files:**
- Modify: `apps/web/src/App.test.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/lib/wallet.test.tsx`
- Modify: `apps/web/src/lib/wallet.tsx`
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/web/src/index.css`

**Interfaces:**
- Consumes: existing page default/named exports and wallet functions from `genlayer.ts`.
- Produces: lazy route components, `RouteFallback`, and connection-time loading of wallet network helpers.

- [ ] **Step 1: Add failing lazy-route behavior tests**

Name the break: route splitting must preserve each route's user-visible contract rather than yielding a blank transition.

Render `/`, `/dashboard`, `/milestones/new`, `/milestones/7`, and `/architecture` through `App`. Retain the current assertions and add a test that a suspended lazy route renders a status element containing `Loading GrantGate…` until its module resolves.

- [ ] **Step 2: Add a failing wallet dynamic-load regression test**

Name the break: opening the public shell must not invoke wallet connection or network-switch code.

Mock `import("./genlayer")` at the module boundary and assert rendering `WalletProvider` does not call `requestInjectedAccount` or `resetClients`; clicking Connect invokes `requestInjectedAccount` once and preserves the existing connected state behavior. Assert component outcomes, not mock existence.

- [ ] **Step 3: Run focused tests and verify RED**

```powershell
pnpm --filter @grantgate/web test -- src/App.test.tsx src/lib/wallet.test.tsx
```

Expected: the route fallback assertion fails and wallet imports remain static.

- [ ] **Step 4: Add route lazy boundaries**

Replace static page imports with `React.lazy` adapters for each named page export, for example:

```tsx
const HomePage = lazy(() => import("@/pages/HomePage").then((module) => ({ default: module.HomePage })));
```

Wrap `Routes` in:

```tsx
<Suspense fallback={<div className="route-loading" role="status">Loading GrantGate…</div>}>
  <Routes>{/* unchanged route paths */}</Routes>
</Suspense>
```

- [ ] **Step 5: Load wallet helpers at action time**

Remove the static runtime import from `wallet.tsx`. Keep type imports type-only. Inside `connectInjected`, call:

```ts
const { requestInjectedAccount, resetClients, walletErrorMessage } = await import("./genlayer");
```

Inside `disconnect`, dynamically load and call `resetClients`, but clear React wallet state synchronously first so disconnection never depends on module loading. If reset loading fails, local disconnection still succeeds.

- [ ] **Step 6: Define stable cache groups without hiding warnings**

Add `build.rollupOptions.output.manualChunks` groups for React/router/query dependencies and `genlayer-js`. Do not raise `chunkSizeWarningLimit`; the build must reveal any remaining oversized chunk.

- [ ] **Step 7: Verify GREEN and inspect emitted chunks**

```powershell
pnpm --filter @grantgate/web test -- src/App.test.tsx src/lib/wallet.test.tsx src/lib/genlayer.test.ts
pnpm --filter @grantgate/web build
```

Expected: route and wallet tests pass; build emits multiple named chunks instead of one 776 kB application chunk. Record every emitted minified and gzip size. If a chunk still exceeds 500 kB, keep the warning and report it as a known limitation.

- [ ] **Step 8: Commit**

```powershell
git add apps/web/src/App.tsx apps/web/src/App.test.tsx apps/web/src/lib/wallet.tsx apps/web/src/lib/wallet.test.tsx apps/web/vite.config.ts apps/web/src/index.css
git commit -m "perf(web): split public and wallet application code"
```

---

### Task 4: Update milestone documentation and fixed evidence draft

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `docs/live-evidence.md`
- Modify: `docs/proof-matrix.md`

**Interfaces:**
- Consumes: verified local test results, exact before/after build sizes, fixed contract ids and links.
- Produces: truthful Milestone 1 release notes and a claim-to-proof map.

- [ ] **Step 1: Update the Unreleased changelog**

Record the accepted/unresolved/replay gallery, fail-closed mismatch handling, route/wallet chunking, exact bundle result, and that the contract source/address did not change.

- [ ] **Step 2: Update README public verification steps**

Change the wallet-free proof path to require checking both milestone `7` and milestone `3`. Explain that `UNRESOLVED / INSUFFICIENT` is evidence of the safe default, not a successful review. Keep the replay wording paired with unchanged milestone `7` readback.

- [ ] **Step 3: Update evidence documents with local status only**

Add a Milestone 1 section containing the current local commit(s), exact test counts, lint/typecheck/build output, before/after chunks, and fixed live links. Mark GitHub push and production Vercel deployment as pending until those actions happen; do not invent deployment ids or times.

- [ ] **Step 4: Run document consistency checks**

```powershell
rg -n "776|UNRESOLVED|milestone #3|milestone #7|contract.*unchanged|pending" README.md CHANGELOG.md docs/live-evidence.md docs/proof-matrix.md
git diff --check
```

Read each match in context and resolve contradictions. Human prose does not get a source-grep unit test.

- [ ] **Step 5: Commit**

```powershell
git add README.md CHANGELOG.md docs/live-evidence.md docs/proof-matrix.md
git commit -m "docs: record public proof performance milestone"
```

---

### Task 5: Complete local and live release gates

**Files:**
- Modify after deployment verification: `docs/live-evidence.md`
- Modify after deployment verification: `docs/proof-matrix.md`

**Interfaces:**
- Consumes: reviewed feature commits, fixed frozen contract, existing GitHub and Vercel projects.
- Produces: pushed commit, verified production deployment, final evidence commit, and English Milestones submission copy.

- [ ] **Step 1: Run the complete local gate**

```powershell
pnpm test
pnpm lint
pnpm typecheck
pnpm build
git diff --check
git status --short
```

Require 0 test failures, 0 lint/type errors, successful build, and only intentional tracked changes. Inspect staged/untracked files for secrets, `.env`, build output, caches, prompts, and local instruction files.

- [ ] **Step 2: Exercise the local production build**

Verify `/`, `/milestones/3`, `/milestones/7`, `/dashboard`, `/milestones/new`, and `/architecture` at desktop and mobile widths. Confirm accepted and unresolved cards, replay pairing, retry/error behavior, wallet gating, direct-route refresh, and no browser console errors.

- [ ] **Step 3: Reconfirm the frozen live contract read-only**

Call `gen_getContractSchema`, read `get_config`, milestone `3`, and milestone `7`, and open the contract/review/replay Explorer pages. Confirm the contract address and source hash remain unchanged, milestone `3` is `UNRESOLVED / INSUFFICIENT`, and milestone `7` is `ACCEPTED / MET` at evidence version `1`.

- [ ] **Step 4: Resolve identities and stop for action-time confirmation**

Run read-only checks for Git author, active GitHub CLI account, origin URL, branch, commits to push, active Vercel user/team/project, and production environment target. State the exact proposed GitHub push and Vercel deployment. Obtain explicit confirmation before either external write.

- [ ] **Step 5: Push and deploy only after confirmation**

Push the reviewed feature branch or confirmed `main` integration to `tranhop26/GrantGate`. Deploy the exact pushed source to the existing GrantGate production project with `VITE_GRANTGATE_ADDRESS=0xA6eE55C2214274474546d8259C893d4540742342` and `VITE_GENLAYER_NETWORK=studionet`. Never print secret values.

- [ ] **Step 6: Verify production anonymously**

Repeat the full browser route matrix on `https://grantgate.vercel.app`, including mobile width and direct refresh. Confirm live proof readbacks, Explorer links, build behavior, and console state.

- [ ] **Step 7: Fix final evidence and submission text**

Replace pending markers with exact pushed commit, deployment id/time, production URL, and measured checks. Prepare English output:

```text
Title: GrantGate Public Proof & Performance
Changes & Improvements: GrantGate now gives anonymous reviewers a live, fail-closed proof gallery covering an accepted milestone, an unresolved milestone, and rejected replay protection. Every promoted decision is parsed from the frozen Studionet contract; missing, malformed, or changed readback is shown as unavailable instead of being replaced with demo data. Route and wallet code splitting removes the previous monolithic application bundle and keeps write-only wallet work out of the initial public shell. The contract source, address, authorization rules, and transaction verification remain unchanged. Tests cover projection mismatches, partial RPC failure, retry behavior, anonymous access, wallet gating, and all existing lifecycle rules.
Evidence links: https://grantgate.vercel.app/ ; https://grantgate.vercel.app/milestones/7 ; https://grantgate.vercel.app/milestones/3 ; https://explorer-studio.genlayer.com/address/0xA6eE55C2214274474546d8259C893d4540742342 ; https://explorer-studio.genlayer.com/tx/0x49cc510fec57224390a8f42a1480f1f8e4a7ddc2745fdc7756a37cda7a9afdd9 ; https://explorer-studio.genlayer.com/tx/0xfc62b8c277b83e83c9c856c22614032ffd46be3f4c3ae77ae1cde38954514c8e
```

Count `Changes & Improvements` with JavaScript `.length` and keep it below 1,000 characters.

- [ ] **Step 8: Commit and reconfirm before the evidence-only push**

Commit only the final evidence document changes. Re-run identity checks and obtain action-time confirmation for the additional push if it was not included in the prior exact action.

---

## Plan self-review

- Every design requirement maps to a task: live multi-outcome proof (Tasks 1–2), fail-closed behavior (Tasks 1–2), route/wallet chunking (Task 3), evidence package (Task 4), and release verification (Task 5).
- Contract source and deployment manifests are explicitly excluded from edits.
- Interfaces use consistent names: `LIVE_PROOF_SPECS` and `matchLiveProof`.
- No implementation placeholder or unverified external identifier is authorized; the unresolved transaction link is explicitly optional until resolved from evidence.
- All behavior changes begin with tests that fail for the expected missing behavior.
