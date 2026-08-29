# GrantGate Explorer Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing frozen GrantGate Studionet deployment independently verifiable and submission-ready for GenLayer Project Explorer without redeploying the Intelligent Contract.

**Architecture:** Keep the deployed contract as the sole source of truth. Add a wallet-free public proof path and wallet-free milestone read path, while restricting all writes to a funded injected wallet and preserving the `FINALIZED → SUCCESS → READBACK` transaction lifecycle. Make fresh-clone verification deterministic, then package truthful Explorer assets, copy, and fixed release evidence.

**Tech Stack:** GenLayer Python Intelligent Contract (unchanged), React 18, TypeScript 5.5, Vite 5, TanStack Query, genlayer-js 1.1.8, Vitest, Testing Library, pytest, Node test runner, pnpm 10.18.2, Vercel.

## Global Constraints

- Keep contract `0xA6eE55C2214274474546d8259C893d4540742342` on Studionet; do not modify or redeploy `packages/contracts/grantgate.py`.
- Preserve contract classification `INTENTIONALLY_FROZEN` and source SHA-256 `8f8b38a95d6082807cd621594142420e25d0b9ead6b346a9ebaa2fb59498c393`.
- Explorer status is `Preview`, never `Live`; Studionet GEN is simulated value.
- Public proof must come from `get_config` and `get_milestone`, not from hardcoded result data or a local manifest.
- Wallet connection gates writes only; a disconnected reviewer must see milestone #7 and its authoritative result.
- Remove browser-generated guest signing. Writes require an injected wallet funded on Studionet.
- Preserve distinct `SIGNING`, `PENDING`, `FINALIZED`, `SUCCESS`, `READBACK`, and `ERROR` states.
- Do not advertise escrow, payments, refunds, appeals, private repositories, or jury selection.
- Use test-first development for behavior changes and add regression coverage for every defect fixed.
- Before GitHub push or Vercel production deployment, stop for action-time confirmation of GitHub identity, repository/branch, Vercel account/team/project, and exact actions.

## File map

- `package.json`: fresh-clone verification ordering.
- `apps/web/src/lib/liveProof.ts`: fixed deployment identifiers and featured milestone id; no outcome data.
- `apps/web/src/components/LiveProof.tsx`: wallet-free contract proof presentation.
- `apps/web/src/components/HowToTry.tsx`: reviewer and optional writer walkthrough.
- `apps/web/src/pages/HomePage.tsx`: compose public proof and walkthrough.
- `apps/web/src/pages/MilestonePage.tsx`: public read, wallet-gated actions.
- `apps/web/src/lib/genlayer.ts`: injected-wallet clients and network/explorer helpers.
- `apps/web/src/lib/wallet.tsx`: injected wallet state only.
- `apps/web/src/lib/tx.ts`: actionable transaction errors.
- `apps/web/src/components/WalletGate.tsx`: funded-wallet guidance for write workspaces.
- `apps/web/src/index.css`: proof, walkthrough, read-only, and responsive styling.
- `apps/web/public/grantgate-logo.svg`: reusable vector mark.
- `apps/web/public/grantgate-logo-1024.png`: Explorer upload asset.
- `CHANGELOG.md`: release history.
- `README.md`: reproducible setup, public verification, funding, and limitations.
- `docs/explorer-submission.md`: exact English Explorer form content and character counts.
- `docs/live-evidence.md`, `docs/proof-matrix.md`: final pushed/deployed evidence only.

---

### Task 1: Make fresh-clone verification deterministic

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: `@grantgate/shared` build output declared by `packages/shared/package.json`.
- Produces: root `pnpm test` that succeeds after install even when `packages/shared/dist` is absent.

- [ ] **Step 1: Reproduce the failing integration condition**

Run from the repository root in PowerShell:

```powershell
Remove-Item -LiteralPath 'packages/shared/dist' -Recurse -Force -ErrorAction SilentlyContinue
pnpm test
```

Expected: FAIL in the web suites with `Failed to resolve entry for package "@grantgate/shared"` after contract and shared tests pass.

- [ ] **Step 2: Add the minimal prerequisite to the root test command**

Change only the root script:

```json
"test": "pnpm --filter @grantgate/shared build && pnpm -r --sequential test"
```

- [ ] **Step 3: Prove the fresh condition now passes**

```powershell
Remove-Item -LiteralPath 'packages/shared/dist' -Recurse -Force -ErrorAction SilentlyContinue
pnpm test
```

Expected: 46 contract pytest tests, 9 deployment-script tests, 18 shared tests, and 31 web tests pass: 104 total, zero failed suites.

- [ ] **Step 4: Commit the isolated fix**

```powershell
git add package.json
git commit -m "test: build shared package before workspace suites"
```

---

### Task 2: Add a wallet-free live proof to the home page

**Files:**
- Create: `apps/web/src/lib/liveProof.ts`
- Create: `apps/web/src/components/LiveProof.tsx`
- Create: `apps/web/src/components/LiveProof.test.tsx`
- Modify: `apps/web/src/pages/HomePage.tsx`
- Modify: `apps/web/src/index.css`

**Interfaces:**
- Consumes: `useMilestone(id)`, `explorerAddressUrl(address)`, `explorerTxUrl(hash)`, `CONTRACT_ADDRESS`, and parsed `Milestone` fields.
- Produces: `FEATURED_MILESTONE_ID: 7`, `LIVE_REVIEW_TX`, `LIVE_REPLAY_TX`, and `<LiveProof />`.

- [ ] **Step 1: Write the failing public-proof component test**

Create `LiveProof.test.tsx` with a contract-derived accepted record and assertions on the visible proof:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useGrantGate", () => ({
  useMilestone: () => ({
    isLoading: false,
    error: null,
    data: {
      id: 7,
      title: "Live proof: immutable GrantGate commit",
      status: "ACCEPTED",
      criteria: ["The evidence bundle maps the frozen source to the public deployment."],
      criteriaResults: ["MET"],
      explanation: "Validators found sufficient observable implementation evidence.",
      commitSha: "0d0bd774cad418e7b1430838bdcc2b0471a4bf5d",
      commitUrl: "https://github.com/tranhop26/grantgate/commit/0d0bd774cad418e7b1430838bdcc2b0471a4bf5d",
      evidenceVersion: 1,
      reviewRound: 1,
    },
  }),
}));

import { LiveProof } from "./LiveProof";

describe("LiveProof", () => {
  it("shows authoritative Studionet proof without requesting a wallet", () => {
    render(<LiveProof />);
    expect(screen.getByText("Preview · Studionet")).toBeInTheDocument();
    expect(screen.getByText("ACCEPTED")).toBeInTheDocument();
    expect(screen.getByText("MET")).toBeInTheDocument();
    expect(screen.getByText(/Validators found sufficient/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open milestone #7/i })).toHaveAttribute("href", "/milestones/7");
    expect(screen.getByRole("link", { name: /successful review transaction/i })).toHaveAttribute("href", expect.stringContaining("0x49cc510f"));
    expect(screen.getByRole("link", { name: /rejected replay transaction/i })).toHaveAttribute("href", expect.stringContaining("0xfc62b8c2"));
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
pnpm --filter @grantgate/web test -- src/components/LiveProof.test.tsx
```

Expected: FAIL because `LiveProof.tsx` does not exist.

- [ ] **Step 3: Add deployment identifiers without hardcoding an outcome**

Create `liveProof.ts`:

```ts
export const FEATURED_MILESTONE_ID = 7;
export const LIVE_REVIEW_TX = "0x49cc510fec57224390a8f42a1480f1f8e4a7ddc2745fdc7756a37cda7a9afdd9";
export const LIVE_REPLAY_TX = "0xfc62b8c277b83e83c9c856c22614032ffd46be3f4c3ae77ae1cde38954514c8e";
```

These constants identify evidence; `status`, `criteriaResults`, `explanation`, and commit data must come from `useMilestone(7)`.

- [ ] **Step 4: Implement the minimal public proof component**

Create `LiveProof.tsx` with explicit loading, RPC error, missing-record, and success branches. The success branch must render:

```tsx
<section className="live-proof" aria-labelledby="live-proof-title">
  <header>
    <div><span className="eyebrow"><span />LIVE CONTRACT READBACK</span><h2 id="live-proof-title">Verify before connecting.</h2></div>
    <span className="preview-chip">Preview · Studionet</span>
  </header>
  <div className="live-proof-grid">
    <article><span>Milestone</span><strong>#{milestone.id}</strong><p>{milestone.title}</p></article>
    <article><span>Decision</span><StatusBadge status={milestone.status} /><p>{milestone.criteriaResults.join(" · ")}</p></article>
    <article><span>Validator explanation</span><p>{milestone.explanation}</p></article>
  </div>
  <div className="button-row">
    <Link className="button button-acid" to={`/milestones/${milestone.id}`}>Open milestone #7</Link>
    <a href={explorerTxUrl(LIVE_REVIEW_TX)}>Successful review transaction ↗</a>
    <a href={explorerTxUrl(LIVE_REPLAY_TX)}>Rejected replay transaction ↗</a>
    <a href={explorerAddressUrl(CONTRACT_ADDRESS)}>Contract ↗</a>
  </div>
</section>
```

- [ ] **Step 5: Compose it into the home page and add responsive styles**

Import and render `<LiveProof />` between the hero and trust grid. Add `.live-proof`, `.live-proof-grid`, and `.preview-chip` rules using existing `--ink`, `--paper`, and `--acid` tokens. At the existing mobile breakpoint, collapse the grid to one column.

- [ ] **Step 6: Verify GREEN and regressions**

```powershell
pnpm --filter @grantgate/web test -- src/components/LiveProof.test.tsx src/App.test.tsx
```

Expected: both files pass; the home page still exposes Create milestone and now exposes public live proof.

- [ ] **Step 7: Commit**

```powershell
git add apps/web/src/lib/liveProof.ts apps/web/src/components/LiveProof.tsx apps/web/src/components/LiveProof.test.tsx apps/web/src/pages/HomePage.tsx apps/web/src/index.css
git commit -m "feat(web): expose wallet-free live contract proof"
```

---

### Task 3: Make milestone detail readable without a wallet

**Files:**
- Create: `apps/web/src/pages/MilestonePage.test.tsx`
- Modify: `apps/web/src/pages/MilestonePage.tsx`

**Interfaces:**
- Consumes: `useMilestone(id)` and `useWallet()`.
- Produces: public record rendering; wallet-gated `submit_evidence`, `resubmit_evidence`, `retry_review`, and `cancel_milestone` controls.

- [ ] **Step 1: Write a failing disconnected-reader test**

Mock `useWallet` as disconnected, `useMilestone` with the accepted milestone from Task 2, and `useGrantGateTx` with an idle mutation. Render `MilestonePage` inside a memory route `/milestones/7` and assert:

```tsx
expect(screen.getByRole("heading", { name: /live proof: immutable/i })).toBeInTheDocument();
expect(screen.getByText("ACCEPTED")).toBeInTheDocument();
expect(screen.getByText(/Validators found sufficient/)).toBeInTheDocument();
expect(screen.getByText(/Connect MetaMask to perform authorized writes/i)).toBeInTheDocument();
expect(screen.queryByRole("button", { name: /submit for validator review/i })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
pnpm --filter @grantgate/web test -- src/pages/MilestonePage.test.tsx
```

Expected: FAIL because the current outer `WalletGate` hides the record.

- [ ] **Step 3: Move wallet gating from reads to actions**

Remove the outer `<WalletGate>` around the query result. Keep the id/loading/error/missing-record branches public. In the record action area add:

```tsx
{!wallet.address && (
  <div className="notice">
    <strong>Read-only verification</strong>
    <span>Connect MetaMask to perform authorized writes. This contract record is public without a wallet.</span>
  </div>
)}
```

Retain every existing permission predicate so forms/buttons render only when `wallet.address` matches the contract role and state.

- [ ] **Step 4: Verify GREEN and permission regressions**

```powershell
pnpm --filter @grantgate/web test -- src/pages/MilestonePage.test.tsx src/lib/permissions.test.ts
```

Expected: public reader test passes and all transition-permission tests remain green.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/pages/MilestonePage.tsx apps/web/src/pages/MilestonePage.test.tsx
git commit -m "feat(web): allow public milestone verification"
```

---

### Task 4: Remove the unfunded guest wallet and improve transaction guidance

**Files:**
- Modify: `apps/web/src/lib/genlayer.ts`
- Modify: `apps/web/src/lib/genlayer.test.ts`
- Modify: `apps/web/src/lib/wallet.tsx`
- Modify: `apps/web/src/lib/wallet.test.tsx`
- Modify: `apps/web/src/lib/contract.ts`
- Modify: `apps/web/src/lib/tx.ts`
- Modify: `apps/web/src/lib/tx.test.ts`
- Modify: `apps/web/src/components/WalletGate.tsx`
- Modify: `apps/web/src/App.test.tsx`

**Interfaces:**
- Consumes: injected EIP-1193 provider and configured `CHAIN`.
- Produces: `WalletKind = "injected"`, injected-only connection, funded-Studionet guidance, and `transactionErrorMessage(error): string`.

- [ ] **Step 1: Change tests first**

Replace the guest-wallet test with an injected connect/disconnect test and add these assertions:

```tsx
expect(screen.queryByRole("button", { name: /guest/i })).not.toBeInTheDocument();
expect(screen.getByText(/already holds GEN on Studionet/i)).toBeInTheDocument();
```

Add a transaction helper test:

```ts
expect(transactionErrorMessage(new Error("insufficient funds for gas"))).toMatch(/fund.*Studionet/i);
expect(transactionErrorMessage(new Error("execution reverted"))).toBe("execution reverted");
```

- [ ] **Step 2: Run focused tests and verify RED**

```powershell
pnpm --filter @grantgate/web test -- src/lib/wallet.test.tsx src/lib/tx.test.ts src/App.test.tsx
```

Expected: FAIL because guest APIs/button still exist and `transactionErrorMessage` is undefined.

- [ ] **Step 3: Remove generated-key behavior at the source**

In `genlayer.ts`, remove `createAccount`, `generatePrivateKey`, `GUEST_KEY`, `guestPrivateKey`, `guestAddress`, and `clearGuestKey`. Narrow `WalletKind` to `"injected"`. Make `signedClient` always use the injected address:

```ts
export function signedClient(address: `0x${string}`): GenLayerClient<GenLayerChain> {
  const key = `${NETWORK}:injected:${address.toLowerCase()}`;
  const cached = clients.get(key);
  if (cached) return cached;
  const client = createClient({ chain: CHAIN, account: address });
  clients.set(key, client);
  return client;
}
```

Change `ensureCorrectChain` to take no wallet kind. Update `contract.ts` to call `ensureCorrectChain()` and `signedClient(wallet.address)`.

- [ ] **Step 4: Simplify wallet context**

Remove `connectGuest` and guest-key cleanup. Successful injected connection sets `kind: "injected"`; disconnect clears clients and local React state only.

- [ ] **Step 5: Add actionable transaction error mapping**

In `tx.ts` export:

```ts
export function transactionErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/insufficient funds/i.test(message)) {
    return "This wallet has no usable GEN on Studionet. Fund it from the Accounts panel in GenLayer Studio, then retry.";
  }
  return message;
}
```

Use this helper in the `executeTransaction` catch branch before publishing the `ERROR` snapshot.

- [ ] **Step 6: Replace guest UI with truthful funding guidance**

`WalletGate` must show one button, `Connect browser wallet`, plus:

```tsx
<p>Use a MetaMask account that already holds GEN on Studionet. For writes, fund it from the Accounts panel in GenLayer Studio before connecting.</p>
<a href="https://studio.genlayer.com/contracts" target="_blank" rel="noreferrer">Open GenLayer Studio ↗</a>
```

The adjacent copy must tell the user to open Studio's account selector and transfer simulated GEN from a pre-funded Studionet account; Studio does not expose a stable `/accounts` deep link.

- [ ] **Step 7: Verify GREEN**

```powershell
pnpm --filter @grantgate/web test -- src/lib/wallet.test.tsx src/lib/tx.test.ts src/lib/contract.test.ts src/App.test.tsx
```

Expected: injected wallet, transaction lifecycle, contract boundary, and app tests pass; no guest control remains.

- [ ] **Step 8: Commit**

```powershell
git add apps/web/src/lib/genlayer.ts apps/web/src/lib/genlayer.test.ts apps/web/src/lib/wallet.tsx apps/web/src/lib/wallet.test.tsx apps/web/src/lib/contract.ts apps/web/src/lib/tx.ts apps/web/src/lib/tx.test.ts apps/web/src/components/WalletGate.tsx apps/web/src/App.test.tsx
git commit -m "fix(web): require funded injected wallets for writes"
```

---

### Task 5: Add a reviewer-ready How to try flow

**Files:**
- Create: `apps/web/src/components/HowToTry.tsx`
- Create: `apps/web/src/components/HowToTry.test.tsx`
- Modify: `apps/web/src/pages/HomePage.tsx`
- Modify: `apps/web/src/index.css`

**Interfaces:**
- Consumes: `/milestones/7`, GenLayer Studio Accounts URL, live contract/readback behavior.
- Produces: `<HowToTry />` with wallet-free verification and optional write trial.

- [ ] **Step 1: Write the failing walkthrough test**

```tsx
render(<HowToTry />);
expect(screen.getByRole("heading", { name: /How to try GrantGate/i })).toBeInTheDocument();
expect(screen.getByText(/No wallet required/i)).toBeInTheDocument();
expect(screen.getByRole("link", { name: /Open milestone #7/i })).toHaveAttribute("href", "/milestones/7");
expect(screen.getByText(/MetaMask account funded on Studionet/i)).toBeInTheDocument();
expect(screen.getByText(/simulated GEN/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run and verify RED**

```powershell
pnpm --filter @grantgate/web test -- src/components/HowToTry.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the exact walkthrough**

Render two ordered flows:

1. `Verify live proof — No wallet required`: open milestone #7; confirm `ACCEPTED`, `MET`, explanation, and commit SHA; open the successful review and rejected replay links.
2. `Try a write — MetaMask required`: use an account funded with simulated GEN from Studio Accounts; create a milestone as sponsor; switch to the assigned builder; submit a canonical lowercase 40-character commit URL; wait through consensus and authoritative readback.

Include a warning that reviewers can complete the verification flow without spending GEN and that Studionet is Preview infrastructure.

- [ ] **Step 4: Add to HomePage and style**

Render `<HowToTry />` after `<LiveProof />`. Use numbered cards, visible prerequisites, and a single-column mobile layout.

- [ ] **Step 5: Verify GREEN and accessibility**

```powershell
pnpm --filter @grantgate/web test -- src/components/HowToTry.test.tsx src/components/LiveProof.test.tsx src/App.test.tsx
```

Expected: walkthrough and home-page tests pass with semantic headings, lists, and links.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/components/HowToTry.tsx apps/web/src/components/HowToTry.test.tsx apps/web/src/pages/HomePage.tsx apps/web/src/index.css
git commit -m "feat(web): add Explorer verification walkthrough"
```

---

### Task 6: Create Explorer assets and truthful submission copy

**Files:**
- Create: `apps/web/public/grantgate-logo.svg`
- Create: `apps/web/public/grantgate-logo-1024.png`
- Create: `CHANGELOG.md`
- Create: `docs/explorer-submission.md`
- Modify: `apps/web/src/components/AppShell.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: app colors `#101923`, `#f3f0e8`, `#c8ff36`; live proof identifiers; verified product behavior.
- Produces: logo assets and form-ready English copy with exact counts.

- [ ] **Step 1: Add the vector logo source**

Create an opaque 512×512 SVG with no text. Use a dark rounded-square background, acid gate pillars, an open center path, and a paper-colored commit diamond:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="104" fill="#101923"/>
  <path d="M126 116h92v280h-92zM294 116h92v280h-92z" fill="#c8ff36"/>
  <path d="M218 166h76v64h-76zM218 282h76v64h-76z" fill="#f3f0e8"/>
  <path d="M256 222l42 34-42 34-42-34z" fill="#c8ff36"/>
</svg>
```

Replace the `GG` text square in `AppShell` with `<img src="/grantgate-logo.svg" alt="" />` while retaining the accessible `GrantGate home` link label.

- [ ] **Step 2: Render and inspect the PNG mechanically**

Use the Browser skill to open the SVG at a 1024×1024 viewport and save a lossless screenshot as `grantgate-logo-1024.png`. Verify with a filesystem/image inspection tool:

```powershell
python -c "from PIL import Image; p='apps/web/public/grantgate-logo-1024.png'; im=Image.open(p); print(im.size, im.mode)"
(Get-Item 'apps/web/public/grantgate-logo-1024.png').Length
```

Expected: `(1024, 1024)`, PNG with an opaque image, and size below 2,000,000 bytes. Visually inspect at original size and at 128 px before acceptance.

- [ ] **Step 3: Add CHANGELOG and README truth corrections**

`CHANGELOG.md` must contain an `Unreleased` section listing wallet-free proof, public milestone reads, injected-wallet-only writes, deterministic tests, Explorer assets, and no contract change.

Update README:

- change `Connect an injected wallet or a local Studionet guest wallet` to injected-only writes;
- add a wallet-free verification path for milestone #7;
- state `Preview on Studionet` and simulated GEN;
- point funding to Studio Accounts, not a faucet;
- make the root test command accurately reproducible;
- retain all current limitations and add that public showcase is fixed to the verified milestone id.

- [ ] **Step 4: Add exact Explorer form content**

Create `docs/explorer-submission.md` with:

- Project name: `GrantGate`.
- Primary category: `Dispute Resolution`.
- Category tag 1: `Evidence Assessment`.
- Category tag 2: leave empty; explain why `Escrow Claims`, `Appeal Review`, and `Jury Selection` are rejected.
- Status: `Preview`.
- One-liner, 117 characters:

```text
GrantGate lets GenLayer validators judge whether an immutable GitHub commit satisfies frozen software-grant criteria.
```

- Description, 852 characters:

```text
GrantGate turns software-grant milestones into verifiable on-chain decisions. A sponsor freezes a builder, public GitHub repository, deadline, and up to five measurable criteria before evidence exists. The assigned builder submits one canonical commit URL. GenLayer validators render that immutable commit and classify every criterion as MET, NOT_MET, or INSUFFICIENT; the contract derives ACCEPTED, REJECTED, or UNRESOLVED and stores the explanation. GrantGate is for grant sponsors and builders who should not control their own outcome. Solidity cannot independently read an unstructured commit page and reach semantic consensus about whether the work satisfies written criteria. GrantGate uses GenLayer for that decision and fails safely when evidence is unavailable or contradictory. Studionet uses simulated GEN and this Explorer entry is Preview.
```

- Expected verification outcome, 377 characters:

```text
Without connecting a wallet, the Live proof panel loads milestone #7 from the Studionet contract. It shows ACCEPTED, criterion result MET, the validator explanation, immutable commit SHA, and links to the successful review transaction. The replay link shows a finalized GenVM ERROR while the milestone readback remains ACCEPTED at evidence version 1, proving replay protection.
```

- Numbered How to try steps matching Task 5.
- Contract, website, and GitHub links from the fixed baseline.

- [ ] **Step 5: Verify character counts and asset constraints**

Use a small Node one-liner or PowerShell script that reads the exact fenced values and confirms `117 ≤ 180`, `852 ≤ 1000`, and `377 ≤ 500`. Re-run the PNG dimension, format, alpha/opacity, and file-size checks.

- [ ] **Step 6: Run repository checks**

```powershell
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Expected: all tests and checks pass. The production bundle may retain the pre-existing Vite chunk-size warning, which must be recorded as a known limitation rather than called a failure.

- [ ] **Step 7: Commit**

```powershell
git add apps/web/public/grantgate-logo.svg apps/web/public/grantgate-logo-1024.png apps/web/src/components/AppShell.tsx CHANGELOG.md README.md docs/explorer-submission.md
git commit -m "docs: package GrantGate Explorer submission"
```

---

### Task 7: Verify, confirm identities, push, deploy, and fix evidence

**Files:**
- Modify after live verification: `docs/live-evidence.md`
- Modify after live verification: `docs/proof-matrix.md`

**Interfaces:**
- Consumes: exact reviewed commits from Tasks 1–6, existing Vercel project, existing Studionet deployment.
- Produces: pushed Git commit, production Vercel deployment, browser-verified public proof, and fixed evidence package.

- [ ] **Step 1: Run the complete local gate from a clean source state**

```powershell
pnpm install --frozen-lockfile
Remove-Item -LiteralPath 'packages/shared/dist' -Recurse -Force -ErrorAction SilentlyContinue
pnpm test
pnpm lint
pnpm typecheck
pnpm build
git diff --check
git status --short
```

Expected: all checks pass; only intentional tracked changes exist; no secrets, `.env`, build output, caches, `node_modules`, prompts, or local instruction files are staged.

- [ ] **Step 2: Exercise the local production build in a browser**

Serve `apps/web/dist`, then verify home, `/milestones/7`, `/dashboard`, `/milestones/new`, and `/architecture` at desktop and mobile widths. Confirm:

- home loads Live proof without a wallet;
- milestone #7 shows `ACCEPTED`, `MET`, explanation, and commit;
- no guest-wallet button exists;
- writes request MetaMask and explain Studionet funding;
- no console errors appear;
- direct-route refresh works.

- [ ] **Step 3: Reconfirm live chain evidence read-only**

Call `gen_getContractSchema` for the fixed address and read `get_config` plus milestones 1–7 with `genlayer-js`. Open the contract and three fixed transaction links in a real browser. Confirm deploy `SUCCESS/Accepted`, review `SUCCESS/Accepted`, replay `ERROR/Accepted`, and milestone #7 unchanged at `ACCEPTED`, evidence version 1.

- [ ] **Step 4: Resolve action identities and stop for confirmation**

Run read-only identity checks:

```powershell
git config user.name
git config user.email
gh auth status
git remote -v
git branch --show-current
git log -1 --oneline
vercel whoami
vercel project ls
```

State the exact GitHub account, repository, branch, commits to push, Vercel account/team/project, and proposed production command. Stop and obtain the user's action-time confirmation before either external write.

- [ ] **Step 5: Push only after confirmation**

```powershell
git push origin main
```

Verify the remote branch resolves to the exact local commit and inspect the public GitHub commit page.

- [ ] **Step 6: Deploy the exact pushed source only after confirmation**

Link the checkout to the confirmed existing GrantGate Vercel project without creating a new project. Confirm production environment values are `VITE_GRANTGATE_ADDRESS=0xA6eE55C2214274474546d8259C893d4540742342` and `VITE_GENLAYER_NETWORK=studionet` without printing secrets. Deploy production and wait for a successful Vercel result.

- [ ] **Step 7: Exercise production as an anonymous reviewer**

Open `https://grantgate.vercel.app` in the Browser with no wallet connection. Repeat the public proof, milestone #7, Explorer links, route refresh, mobile layout, and console checks. Do not claim readiness if any expected artifact differs from `docs/explorer-submission.md`.

- [ ] **Step 8: Fix the final evidence documents**

Record the exact pushed commit, production deployment time/URL, source hash, contract address, deployment transaction, test/lint/typecheck/build results, live accepted proof, replay rejection, and known bundle warning. Update the proof matrix so every Explorer claim maps to a live readback, transaction, source, or test.

- [ ] **Step 9: Commit, reconfirm, push the evidence-only update**

```powershell
git add docs/live-evidence.md docs/proof-matrix.md
git commit -m "docs: fix Explorer release evidence"
```

Run the identity/context check again and obtain action-time confirmation for this additional push. Push, allow Vercel to deploy the evidence-only commit if the project is Git-connected, then verify the final public state and record the final commit.

---

## Final proof checklist

- [ ] Contract source unchanged and Git blob SHA-256 matches the frozen deployment manifest.
- [ ] Fresh-clone `pnpm test` passes without a pre-existing shared `dist` directory.
- [ ] Full tests, lint, GenVM lint, typecheck, and build pass.
- [ ] Anonymous home and milestone #7 reads work in production.
- [ ] No guest wallet or browser-generated signing key remains.
- [ ] Explorer logo is opaque PNG, 1024×1024, and below 2 MB.
- [ ] One-liner, description, and expected outcome remain within 180/1000/500 characters.
- [ ] GitHub and Vercel identities were confirmed at action time.
- [ ] Exact pushed commit and deployed production version are recorded.
- [ ] Explorer contract and transaction pages show the claimed GenVM/consensus results.
- [ ] Known limitations remain truthful: public GitHub only, no custody, no appeal, frozen contract, Studionet Preview, existing large-bundle warning.
