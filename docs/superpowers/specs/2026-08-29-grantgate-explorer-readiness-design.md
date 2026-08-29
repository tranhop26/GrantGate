# GrantGate Explorer Readiness Design

**Date:** 2026-08-29  
**Status:** Approved in conversation  
**Scope:** Harden the existing GrantGate frontend, verification workflow, tests, and public documentation for GenLayer Project Explorer. Keep the deployed Intelligent Contract unchanged.

## Objective

Make GrantGate independently verifiable by an Explorer reviewer who opens the production website without a connected wallet. Preserve the existing frozen Studionet contract and its live evidence while removing misleading wallet behavior, making fresh-clone verification reproducible, and delivering truthful submission assets within the Explorer form limits.

## Current verified baseline

- Network: GenLayer Studionet, Explorer status `Preview`.
- Contract: `0xA6eE55C2214274474546d8259C893d4540742342`.
- Deployment transaction: `0xa4cb6ae9e7a3bdcde3acfc6a012c912b97125992ed77fbc1f50df94198d95e98`, `FINALIZED`, GenVM `SUCCESS`, consensus `Accepted`.
- Contract classification: `INTENTIONALLY_FROZEN`.
- Frozen source SHA-256: `8f8b38a95d6082807cd621594142420e25d0b9ead6b346a9ebaa2fb59498c393`.
- Live accepted proof: milestone `#7`, result vector `MET`.
- Live submission transaction: `0x49cc510fec57224390a8f42a1480f1f8e4a7ddc2745fdc7756a37cda7a9afdd9`, `SUCCESS`, consensus `Accepted`.
- Replay rejection transaction: `0xfc62b8c277b83e83c9c856c22614032ffd46be3f4c3ae77ae1cde38954514c8e`, GenVM `ERROR`, consensus `Accepted`, authoritative milestone readback unchanged.
- Existing suite: 104 tests pass after building `@grantgate/shared`; a fresh clone running `pnpm test` currently fails because that prerequisite is not automatic.

## Trust model

| Actor | Cannot trust | Manipulation capability | Contract or product defense | Required evidence |
|---|---|---|---|---|
| Sponsor | Builder | Select a favorable summary or mutable work reference | Criteria, repository, builder, and deadline are frozen before evidence submission | Created milestone readback and creation transaction |
| Builder | Sponsor | Move criteria or personally approve/reject delivery | No sponsor result setter or admin override; outcome is derived by validator consensus | Contract source, schema, and terminal decision readback |
| Reviewer | Frontend or repository claims | Hide failures, hardcode a result, or show stale off-chain state | Public showcase reads the deployed contract without a wallet and links immutable evidence | Milestone #7 readback, commit URL, contract and transaction links |
| User | Browser-generated guest wallet | Present an unfunded generated address as usable | Remove guest signing; writes require an injected wallet on the configured chain | Wallet network state, transaction lifecycle, final contract readback |
| Contract | Untrusted web evidence | Prompt injection, unavailable pages, malformed LLM output | Evidence binding, delimiter neutralization, semantic comparison, safe `UNRESOLVED` | Source tests plus live accepted and unresolved records |

## Decision and consequence

The exact GenLayer decision is: for each frozen software-milestone criterion, does the bound immutable GitHub commit provide sufficient observable evidence for `MET`, `NOT_MET`, or `INSUFFICIENT`?

The on-chain consequence is a milestone status derived exclusively from the criterion vector:

- all `MET` becomes `ACCEPTED`;
- any `NOT_MET` becomes `REJECTED`;
- otherwise the result becomes `UNRESOLVED`;
- actor statistics and review metadata are updated with the authoritative result.

GrantGate does not custody funds, release escrow, transfer tokens, or implement a second-level appeal. The Explorer listing must not imply those features.

## Evidence binding

Evidence is bound to a lowercase GitHub owner/repository identity, a canonical HTTPS commit URL, a full lowercase 40-character SHA, evidence version, review round, milestone id, schema version, and submission timestamp. The contract renders the public commit page on-chain, checks the repository identity and SHA marker, and treats unavailable, mismatched, malformed, or insufficient evidence as `INSUFFICIENT` rather than success.

The public showcase must display only data read from the deployed contract and links derived from that readback. It may identify milestone #7 as the featured verified record, but it must not embed a fabricated result or substitute a local JSON manifest for a contract read.

## State machine and recovery

| From | Actor | Action | Authoritative result | To | Replay behavior |
|---|---|---|---|---|---|
| New | Sponsor | `create_milestone` | Frozen milestone readback | `OPEN` | A separate call creates a separate id |
| `OPEN` | Assigned builder | `submit_evidence` | Validator criterion vector | `ACCEPTED`, `REJECTED`, or `UNRESOLVED` | Repeated first submission is rejected |
| `OPEN` | Sponsor | `cancel_milestone` | Cancellation readback | `CANCELLED` | Further cancellation/submission is rejected |
| `REJECTED` | Assigned builder | `resubmit_evidence` with a new SHA | New validator criterion vector | `ACCEPTED`, `REJECTED`, or `UNRESOLVED` | Used SHA and version overflow are rejected |
| `UNRESOLVED` | Sponsor or builder | `retry_review` after cooldown | Same evidence, next review round | `ACCEPTED`, `REJECTED`, or `UNRESOLVED` | Early, unauthorized, or exhausted retry is rejected |
| `ACCEPTED` or `CANCELLED` | Any actor | Any transition | No mutation | unchanged | Rejected |

The contract remains `INTENTIONALLY_FROZEN`. There is no proxy, owner, upgrade key, result override, privileged migration, or contract redeployment in this scope. If contract logic must change later, the team must deploy a new versioned address and preserve the legacy deployment as read-only evidence.

## Product architecture

### Public verification path

The production home page will contain a `Live proof` section that reads `get_config` and `get_milestone(7)` from the configured contract without requesting a wallet. It will show the network and Preview status, milestone title, terminal status, criterion vector, validator explanation, commit SHA/link, contract link, successful review transaction, and rejected replay transaction.

The direct `/milestones/7` route will also support read-only rendering without a wallet. Wallet connection gates only the action controls. A disconnected reviewer can inspect a complete authoritative record, while a connected authorized actor can see the appropriate write action.

### Transaction path

All writes continue through `genlayer-js` and an injected wallet. Before writing, the app switches or adds the configured GenLayer network. The UI preserves the distinct lifecycle `SIGNING → PENDING → FINALIZED → SUCCESS → READBACK`; no success message is shown until the contract readback proves the requested state transition.

The generated Studionet guest wallet path will be removed. A newly generated browser wallet begins unfunded and cannot provide a stable Explorer trial flow. The app will instead explain that a writer needs an already-funded injected wallet on Studionet and point to the Studio Accounts funding source.

### Explorer guidance

The product will provide a concise `How to try` path with two levels:

1. Verify live evidence without a wallet by opening the featured milestone and its Explorer links.
2. Run the write flow with MetaMask: switch to Studionet, fund the wallet from GenLayer Studio Accounts, create a milestone as sponsor, connect as the assigned builder, submit a canonical commit, wait for consensus, and inspect authoritative readback.

The guidance must identify Studionet as simulated value and the listing status as `Preview`. It must not send users to a testnet faucet or call the deployment `Live` in the Explorer status sense.

## UI states and errors

- `OPEN`: show frozen terms and the permitted sponsor/builder action.
- `ACCEPTED`: show all criterion results, explanation, commit proof, completion time, and immutable terminal status.
- `REJECTED`: show failed criteria and allow only the assigned builder to submit a different unused commit within the version limit.
- `UNRESOLVED`: explain safe failure and permit sponsor/builder retry only when the cooldown and round limit allow it.
- `CANCELLED`: show terminal cancellation and no action controls.
- Disconnected: public reads remain available; writes explain that MetaMask is required.
- Wrong network: offer the network switch/add flow before signing.
- Unfunded wallet: show an actionable Studionet funding explanation instead of implying that a generated guest can transact.
- Consensus or execution failure: preserve the failed transaction link and do not advance local state.
- Readback mismatch: report that finality did not prove the intended state change and keep the prior authoritative view.

## Testing strategy

The root test command must work from a fresh clone after `pnpm install --frozen-lockfile`. It will build or otherwise expose `@grantgate/shared` before web tests resolve the package. Existing 104 tests remain green.

New tests will cover:

- disconnected users can see the featured live milestone and its contract-derived outcome;
- `/milestones/7` renders read-only evidence without a wallet;
- write controls remain hidden or gated when disconnected;
- the guest-wallet option and generated-key path are absent;
- loading, missing-record, RPC error, and terminal-state presentations remain explicit;
- Explorer URLs, network name, and Preview labeling use the configured Studionet deployment;
- fresh-clone test ordering no longer depends on a manually generated shared `dist` directory.

Verification before release includes the full test suite, lint, GenVM lint, typecheck, production build, public-route browser checks, incognito-equivalent disconnected checks, console inspection, RPC schema read, live milestone readback, Explorer transaction inspection, and source/deployment hash comparison.

## Repository and submission deliverables

- Add a `CHANGELOG.md` entry describing Explorer readiness changes.
- Add a reusable logo source plus PNG assets that meet Portal requirements: PNG, 128–2048 px, less than 2 MB, opaque background, readable at 128 px.
- Update README with the public verification path, exact network, funding instructions, truthful limitations, and reproducible verification commands.
- Update the evidence and proof documents only with observed results from the final pushed/deployed state.
- Add an English Explorer submission draft with project name, category, tags, one-liner, description, numbered trial steps, expected verification outcome, contract link, website, GitHub link, Preview status, exact character counts, and known limitations.

Recommended Explorer taxonomy:

- Primary category: `Dispute Resolution`, because GrantGate adjudicates a sponsor's frozen delivery claim from builder-supplied evidence and derives the authoritative outcome by validator consensus. `AI & Agents` is rejected because GrantGate is not agent infrastructure.
- Category tag 1: `Evidence Assessment`, implemented by `submit_evidence` and `_judge` over a canonical commit URL.
- No second tag unless the Portal permits one to remain empty; `Escrow Claims`, `Appeal Review`, and `Jury Selection` would misrepresent the current contract.

## Release gates

Before GitHub push or Vercel production deployment, verify and present:

- Git author and active GitHub CLI account;
- repository owner, remote, branch, commit, staged and untracked files;
- Vercel account/team and the exact GrantGate project;
- the exact push and deployment actions;
- confirmation from the user for that identity and action context.

After confirmation, push the reviewed commit, deploy the exact pushed source to the existing Vercel project, wait for deployment completion, and exercise the production URL again. Do not deploy a new contract in this scope.

## Completion evidence

The work is complete only when the final package records the exact Git commit, contract source hash, Studionet contract and deployment transaction, production URL, test/lint/typecheck/build results, known limitations, live accepted proof, replay-rejection proof, and a proof matrix mapping every material submission claim to a contract readback, transaction, source file, or test.

## Non-goals

- Contract changes or redeployment.
- Token custody, escrow, payouts, or refunds.
- New appeal or arbitration mechanics.
- Private GitHub repository support.
- Backend services or off-chain result storage.
- Milestone farming strategy after Explorer acceptance.
