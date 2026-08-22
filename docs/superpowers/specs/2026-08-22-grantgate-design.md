# GrantGate Design Specification

## Product boundary

GrantGate is a GenLayer MVP for accepting software grant milestones from public, immutable GitHub commits. A sponsor defines one milestone for one builder wallet and binds it to one repository. The builder submits a canonical commit URL. GenLayer validators inspect the rendered commit against the sponsor's numbered acceptance criteria and establish the authoritative result.

The MVP does not custody or transfer funds. Its on-chain consequence is an immutable completion record plus sponsor and builder outcome counters. This keeps the promoted workflow complete without presenting simulated Studionet value as real settlement.

GrantGate is an original use case. It does not reuse BrickProof's seller, warranty, product, claim, pool, payout, or escrow model. It only adopts the reference repository's useful engineering boundaries: contract, shared parsing layer, frontend, deploy/live-E2E scripts, polling, and chain-derived readback.

## Trust model

| Actor | Cannot trust | Can manipulate | Contract defense | Test/evidence |
|---|---|---|---|---|
| Sponsor | Builder | Submit unrelated, mutable, or incomplete work | Repository is frozen at creation; only a canonical 40-hex GitHub commit URL for that repository is accepted; validators inspect the page against frozen criteria | Wrong repository/SHA/actor tests; live rejected submission |
| Builder | Sponsor | Reject completed work, change criteria, cancel after submission | Criteria, assigned builder, repository, deadline, and schema version are frozen on-chain; sponsor cannot choose the verdict or cancel after the first submission | Authorization and transition tests; accepted live readback |
| Sponsor and builder | Frontend/backend/operator | Hide or substitute the result | There is no backend; the frontend reads contract state and transaction receipts directly; the contract recomputes the decision from validator item results | Wrapper/parser tests; browser readback against deployed address |
| Validators | Evidence author and rendered page | Prompt injection, misleading text, unavailable content | All evidence and criteria are fenced as untrusted data; fixed output vocabulary; exact item-count validation; insufficient or malformed results fail closed | Prompt-injection, malformed-output, unavailable-page, and `UNRESOLVED` tests |
| Public caller | Sponsor and builder | Replay submissions or call another actor's transitions | Wallet authorization, milestone/evidence versions, attempt limits, cooldown, and state guards | Replay, repeated retry, and already-terminal tests |

## Decision and consequence

**Decision:** for each frozen acceptance criterion, GenLayer establishes exactly one semantic result: `MET`, `NOT_MET`, or `INSUFFICIENT`, based on the public GitHub commit page bound to the milestone.

The contract derives the milestone result; the model does not get to select an independent overall outcome:

- every item `MET` → `ACCEPTED`;
- at least one item `NOT_MET` → `REJECTED`;
- otherwise, or for unusable evidence/output → `UNRESOLVED`.

Validator equivalence compares the normalized per-item result vector exactly. Explanatory text is stored from the leader for readback but is excluded from equivalence. Output with the wrong number of items, unknown labels, inconsistent structure, or excessive length is unusable and produces no favorable default.

**On-chain consequence:** `ACCEPTED` freezes a completion record for the milestone and increments the builder's accepted count and sponsor's accepted count once. `REJECTED` and `UNRESOLVED` record their outcome but never create a completion record. Replays cannot increment counters again.

An actual protocol-level consensus failure may prevent the transaction from finalizing, so it cannot write `UNRESOLVED`. In that case no state transition or counter change occurs; the UI reports the transaction failure/timeout and reads back the prior authoritative state. Contract-level unavailable, insufficient, malformed, or contradictory evidence resolves safely to `UNRESOLVED` when consensus can agree on insufficiency.

## Evidence binding

Each milestone freezes:

- sponsor and assigned builder addresses;
- GitHub `owner/repository` identity;
- one to five numbered criteria, each 20–400 characters;
- criteria schema version `1`;
- creation time and submission deadline.

Each submission binds:

- canonical source `https://github.com` with no userinfo, port, query, fragment, backslash, alternate host, or trailing ambiguity;
- the exact frozen owner and repository;
- a lowercase 40-hex commit SHA and canonical commit URL;
- submitter address, milestone ID, evidence version, review round, submission time, and summary;
- replay domain `grantgate:v1:<milestone_id>:<evidence_version>:<review_round>:<commit_sha>`.

The contract stores the URL, SHA, summary, timestamps, versions, result vector, explanation, and final status. GitHub commit URLs are immutable by SHA; evidence freshness is enforced by requiring submission before the milestone deadline. A rendered page that is unavailable, malformed, contradictory, does not identify the expected repository/SHA, or lacks enough information yields `INSUFFICIENT`/`UNRESOLVED`, never acceptance.

## Actors, methods, and state machine

Statuses are `OPEN`, `ACCEPTED`, `REJECTED`, `UNRESOLVED`, and `CANCELLED`.

| From | Actor | Method | Preconditions | On-chain effect | To | Replay behavior |
|---|---|---|---|---|---|---|
| none | any sponsor | `create_milestone` | Valid builder, repository, 1–5 criteria, future deadline | Stores frozen milestone and indexes it by sponsor/builder | `OPEN` | Creates a new ID; input cannot overwrite an existing milestone |
| `OPEN` | sponsor | `cancel_milestone` | No submission has ever been made | Stores cancellation | `CANCELLED` | Already cancelled/attempted cases revert |
| `OPEN` | assigned builder | `submit_evidence` | Before deadline; valid bound commit URL; zero prior attempts | Stores evidence version 1, runs semantic review, derives result | `ACCEPTED`, `REJECTED`, or `UNRESOLVED` | Same call cannot finalize twice; transaction failure is atomic |
| `REJECTED` | assigned builder | `resubmit_evidence` | Before deadline; fewer than 3 evidence versions; different commit SHA | Stores next evidence version and reviews it | `ACCEPTED`, `REJECTED`, or `UNRESOLVED` | Same SHA for the same milestone is rejected |
| `UNRESOLVED` | sponsor or assigned builder | `retry_review` | Same evidence; fewer than 3 review rounds; cooldown elapsed | Increments review round and reviews the same bound evidence | `ACCEPTED`, `REJECTED`, or `UNRESOLVED` | Early, excessive, concurrent, or terminal retries revert |

`ACCEPTED` and `CANCELLED` are terminal. `REJECTED` becomes terminal at the deadline or third evidence version. `UNRESOLVED` becomes safely non-actionable at the deadline or third review round; no completion record is created. There is no owner override, manual approval, result setter, or backend callback.

## Contract shape

The GenVM contract owns all authoritative records and indexes:

- `milestones: TreeMap[u256, Milestone]`;
- sponsor and builder milestone ID indexes;
- sponsor and builder outcome counters;
- per-milestone used commit SHAs;
- monotonic milestone count.

Write methods are the five transitions above. Read methods return config, one milestone, paginated sponsor/builder milestones, counts, and actor statistics. Events cover creation, submission, review result, retry, and cancellation. Every counter update occurs only after validating authorization/state and is guarded by the transition so execution is idempotent.

The judgment prompt treats criteria, builder summary, and fetched GitHub content as untrusted quoted material. It asks validators to inspect the actual commit identity and changes, not merely the page's wording or JSON shape. The equivalence principle compares the semantic item-result vector.

## Contract classification and recovery

The contract is **INTENTIONALLY_FROZEN**.

- There is no owner, upgrader, delegatecall, proxy, privileged result setter, or mutable contract-address registry.
- Accepted records remain readable at the original deployed address permanently for that network.
- Recovery from a contract defect is a new deployment with a new manifest and frontend configuration. Existing accepted records stay on the legacy address; open work is recreated explicitly on the replacement contract rather than silently migrated.
- The README includes a recovery runbook and the UI exposes the configured contract address and explorer link.
- Direct tests prove that no write entrypoint can change another sponsor's milestone, rewrite frozen criteria/repository, or alter a terminal accepted record.

## Repository and architecture

The implementation is a pnpm workspace:

- `packages/contracts/grantgate.py`: complete Intelligent Contract and semantic judgment.
- `packages/contracts/tests`: direct/unit tests with a GenVM stub plus lifecycle, adversarial, consensus-failure, and recovery-classification coverage.
- `packages/contracts/scripts/deploy.mjs`: environment-driven Studionet/Asimov deployment that waits for finalization and writes a secret-free manifest.
- `packages/contracts/scripts/e2e.mjs`: live create → submit → finalized/execution-success → readback flow plus one important rejected/unauthorized branch.
- `packages/shared`: contract status/types, strict parsers, validation constants, and cross-language fixtures.
- `apps/web`: responsive React/Vite frontend with wallet state, chain clients, typed reads/writes, queries, and focused pages.
- `deployments/<network>.json`: network, address, deployment transaction, explorer URLs, source hash, constructor args, classification, timestamp, and exact git commit when available.

There is no application backend or database. Local UI state never advances the milestone ahead of contract readback.

## Frontend workflow and visual direction

The visual concept is a compact grant-review desk: warm off-white canvas, ink/navy typography, acid-green success accents, amber unresolved states, red errors, and monospace commit identifiers. It will not reuse BrickProof branding, copy, layout, or component styling.

Routes:

- `/`: product explanation and public contract activity/readback;
- `/milestones/new`: sponsor creation form;
- `/dashboard`: milestones for the connected wallet, separated by sponsor/builder role;
- `/milestones/:id`: frozen criteria, commit evidence, transaction lifecycle, validator result vector, explanation, and allowed next action;
- `/architecture`: concise trust/evidence/state/recovery disclosure.

The UI distinguishes:

- wallet unavailable/disconnected;
- wallet prompt/signing;
- submitted transaction pending consensus;
- transaction `FINALIZED`;
- execution `SUCCESS` versus execution error;
- contract readback confirmed;
- `ACCEPTED`, `REJECTED`, `UNRESOLVED`, and `CANCELLED` contract states;
- missing/invalid configuration and read errors.

Every successful write waits for `FINALIZED`, verifies execution success, invalidates relevant queries, and then displays state obtained by a contract read. Explorer links expose the exact transaction and contract. The deployed app contains no mock milestones or fake success path.

## Validation and error handling

Contract and mirrored frontend validation cover address shape, actor mismatch, repository names, exact canonical commit URL, SHA, criterion count/length, summary length, deadline, attempt count, cooldown, and terminal-state guards. Contract validation remains authoritative; frontend validation only avoids guaranteed reverts.

Web fetch and prompt content are bounded. Delimiter sequences are neutralized before prompt composition. Any parse, content, identity, length, or semantic insufficiency failure closes to `UNRESOLVED`. Actual consensus/receipt failures retain the previous on-chain state and surface a retryable UI error.

## Test and evidence strategy

Development follows red-green-refactor. Direct tests cover every write/view entrypoint and at minimum:

- unauthorized sponsor/builder/public callers;
- invalid and terminal transitions;
- duplicate/replayed commit SHA and repeated retry;
- missing, malformed, wrong-repository, wrong-SHA, stale, and oversized evidence;
- exact semantic equivalence, contradictory vectors, malformed validator output, unavailable render, consensus failure, and `UNRESOLVED`;
- attempt/cooldown limits and atomic no-change behavior;
- one-time accepted counters and immutable terminal records;
- absence of privileged upgrade/recovery methods.

Shared/frontend tests cover strict chain-value parsing, address/ID/URL validation, wallet/network errors, transaction phases, finalized-versus-execution status, cache invalidation, readback, accessibility, responsive critical layouts, and all advertised UI states.

Integration evidence has two layers:

1. deterministic contract-shape fixtures exercise frontend parsers/wrappers against actual direct-contract return shapes;
2. after authorized deployment, the live E2E script and browser exercise the real frontend against the deployed contract for one accepted milestone and one important error/rejected branch, then verify explorer transaction and contract readback.

Completion requires fresh successful output from lint, typecheck/build, all direct/unit/integration tests, secret scan, deployed source hash, exact commit, Studionet address and deployment transaction, Vercel URL, live accepted transaction, error-branch evidence, and the actor-to-readback proof matrix. Missing live evidence remains an explicit limitation and prevents a completion claim.

## External-action gates

Before GitHub push, contract deployment, or Vercel deployment, execution stops at action time. Read-only checks identify the Git author, active GitHub account, remote owner, deployment wallet, Vercel account/team/project, environment availability, and exact proposed action. The action proceeds only after the user confirms that identity context and action. Secrets are read only from environment variables and never printed, committed, placed in README, or written into deployment manifests.
