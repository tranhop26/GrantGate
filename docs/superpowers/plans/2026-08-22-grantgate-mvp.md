# GrantGate MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, test, deploy, and verify a complete GenLayer MVP that lets a sponsor define a software milestone and lets validators accept, reject, or safely leave unresolved a builder's immutable GitHub commit evidence.

**Architecture:** A frozen Python/GenVM Intelligent Contract is the sole source of milestone truth. A strict shared TypeScript package normalizes contract read shapes, and a backend-free React/Vite frontend performs real wallet writes, waits for transaction finalization and execution success, then renders contract readback. Environment-driven scripts deploy the exact source, emit a source-bound manifest, and run the live lifecycle.

**Tech Stack:** Python/GenVM, `genlayer-js@^1.1.8`, pytest via `uvx`, pnpm 10, TypeScript 5.5, React 18, Vite 5, TanStack Query 5, Vitest 2, Testing Library, Tailwind CSS 3, Vercel CLI.

## Global Constraints

- The contract is `INTENTIONALLY_FROZEN`: no owner, proxy, upgrader, privileged result setter, or mutable registry.
- The contract is authoritative for actors, evidence, state transitions, decision derivation, completion records, and counters.
- There is no backend/database and no mock data in advertised live workflows.
- Only canonical public URLs shaped as `https://github.com/<owner>/<repo>/commit/<40-hex-sha>` may be judged.
- Criteria count is 1–5; each criterion is 20–400 characters; a milestone permits at most 3 evidence versions and 3 review rounds per evidence version.
- `ACCEPTED` requires every normalized item result to be `MET`; any `NOT_MET` means `REJECTED`; otherwise the result is `UNRESOLVED`.
- Protocol consensus failure causes no state advance; evidence/output insufficiency fails closed to `UNRESOLVED`.
- The frontend distinguishes disconnected, signing, pending, `FINALIZED`, execution `SUCCESS`, execution error, and contract readback.
- Secrets come only from environment variables. `.env.example`, source, logs, README, commits, and manifests contain no real token/private key/secret.
- Stop for user confirmation immediately before GitHub push, contract deployment, and Vercel deployment after checking the exact identity/account context.
- No completion claim without exact commit/source hash, deployment transaction/address/explorer, live URL, fresh test output, live happy-path/error evidence, and proof matrix.

---

## File map

```text
grantgate/
├── .env.example                         # public configuration names only
├── .gitignore                           # dependencies, env, caches, build, local evidence
├── package.json                         # root scripts and pinned package manager
├── pnpm-workspace.yaml                  # apps/* and packages/*
├── vercel.json                          # SPA rewrite and web build/output settings
├── deployments/                         # secret-free live deployment manifests
├── docs/superpowers/                    # approved design and this plan
├── packages/contracts/
│   ├── grantgate.py                     # full Intelligent Contract
│   ├── package.json                     # direct tests, lint, deploy, live E2E
│   ├── scripts/deploy.mjs               # deploy/finalize/readback/manifest
│   ├── scripts/e2e.mjs                  # real-chain accepted and error flows
│   └── tests/
│       ├── _stubs/genlayer.py           # deterministic GenVM/test context
│       ├── conftest.py                   # contract loader and actor fixtures
│       ├── test_milestones.py            # create/cancel/auth/frozen fields
│       ├── test_evidence.py              # canonical URL and replay binding
│       ├── test_judgment.py              # semantic output and fail-closed paths
│       ├── test_retries.py               # resubmit/retry/cooldown/terminal guards
│       ├── test_views.py                 # exact frontend-facing read shapes
│       ├── test_lifecycle.py             # end-to-end direct lifecycle
│       └── test_frozen.py                # absence of privileged recovery paths
├── packages/shared/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/index.ts                      # types, parsers, status/validation helpers
│       └── index.test.ts                 # cross-language read-shape fixtures
└── apps/web/
    ├── package.json
    ├── index.html
    ├── vite.config.ts
    ├── vitest.config.ts
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── public/_redirects                 # SPA hosting fallback
    └── src/
        ├── main.tsx / App.tsx / index.css
        ├── lib/genlayer.ts               # networks, clients, final receipt checks
        ├── lib/wallet.tsx                # injected and Studionet guest wallet state
        ├── lib/contract.ts               # typed reads/writes
        ├── lib/tx.ts                     # explicit transaction phase reducer
        ├── lib/format.ts                 # safe formatting/error extraction
        ├── hooks/useGrantGate.ts          # query/mutation/readback reconciliation
        ├── components/                    # shell, state badges, criterion results, forms
        ├── pages/                         # home, create, dashboard, detail, architecture
        └── test/                          # setup and deterministic integration adapter
```

---

### Task 1: Workspace and first authoritative milestone transition

**Files:**
- Create: `.gitignore`, `.env.example`, `package.json`, `pnpm-workspace.yaml`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tests/_stubs/genlayer.py`
- Create: `packages/contracts/tests/conftest.py`
- Test: `packages/contracts/tests/test_milestones.py`
- Create after RED: `packages/contracts/grantgate.py`

**Interfaces:**
- Produces contract constructor `GrantGate()` with storage count `milestone_count`.
- Produces write method `create_milestone(title: str, builder: Address, repo_owner: str, repo_name: str, criteria: str, deadline: u256) -> None`.
- Produces read method `get_milestone(id: u256) -> dict`.
- Criterion storage uses newline-delimited text; blank lines are rejected and `criteria_count` is stored.

- [ ] **Step 1: Create workspace configuration and the deterministic GenVM stub**

Root scripts must be exact:

```json
{
  "scripts": {
    "build": "pnpm --filter @grantgate/shared build && pnpm --filter @grantgate/web build",
    "typecheck": "pnpm -r --if-present typecheck",
    "test": "pnpm -r --sequential test",
    "test:contract": "pnpm --filter @grantgate/contracts test",
    "test:shared": "pnpm --filter @grantgate/shared test",
    "test:web": "pnpm --filter @grantgate/web test",
    "lint:genvm": "uvx --from genvm-linter genvm-lint check packages/contracts/grantgate.py",
    "deploy:contract": "node packages/contracts/scripts/deploy.mjs",
    "e2e:live": "node packages/contracts/scripts/e2e.mjs"
  },
  "packageManager": "pnpm@10.18.2"
}
```

The stub must expose `gl.Contract`, `gl.public.write`, `gl.public.view`, `gl.message.sender`, `gl.message.timestamp`, `gl.Address`, `gl.TreeMap`, `gl.Event`, and a programmable nondeterministic judgment hook. `conftest.py` loads `grantgate.py` with the stub inserted as `genlayer` and provides `sponsor`, `builder`, `outsider`, `set_sender`, `set_time`, and `judge_as(items, explanation)` fixtures.

- [ ] **Step 2: Write the first failing create/read tests**

```python
def test_sponsor_creates_frozen_open_milestone(contract, sponsor, builder, set_sender, set_time):
    set_sender(sponsor)
    set_time(1_800_000_000)
    contract.create_milestone(
        "Ship CSV export",
        builder,
        "open-labs",
        "ledger",
        "Export includes a stable header row.\nExport preserves UTF-8 project names.",
        1_800_086_400,
    )
    row = contract.get_milestone(1)
    assert row["status"] == "OPEN"
    assert row["sponsor"] == sponsor
    assert row["builder"] == builder
    assert row["repo"] == "open-labs/ledger"
    assert row["criteria_count"] == 2
    assert row["evidence_version"] == 0


def test_create_rejects_invalid_builder_and_criteria(contract, sponsor, set_sender):
    set_sender(sponsor)
    with pytest.raises(Exception, match="builder"):
        contract.create_milestone("Ship export", sponsor, "open-labs", "ledger", "too short", 1_900_000_000)
```

- [ ] **Step 3: Run RED**

Run: `pnpm test:contract -- test_milestones.py -q`

Expected: FAIL because `packages/contracts/grantgate.py` or `GrantGate.create_milestone` does not exist.

- [ ] **Step 4: Implement the minimal contract model and validation**

Create status constants and a `Milestone` record with all frozen identity fields and zeroed evidence/result fields. Validate title length 3–120, nonzero distinct builder, lowercase-normalized GitHub owner/repository tokens, 1–5 nonblank criteria of 20–400 characters, total criteria length at most 2,000, and a deadline later than the current timestamp. Store sponsor from `gl.message.sender`; there is no global owner.

- [ ] **Step 5: Add cancellation/auth/frozen-field tests, then implement `cancel_milestone`**

Tests must prove only the sponsor can cancel an untouched `OPEN` record; nonexistent IDs, outsider calls, second cancellation, and cancellation after `evidence_version > 0` revert. No method may modify builder, repo, criteria, deadline, or sponsor.

- [ ] **Step 6: Run GREEN and commit**

Run: `pnpm test:contract -- test_milestones.py -q`

Expected: PASS with no warnings.

Commit: `git add .gitignore .env.example package.json pnpm-workspace.yaml packages/contracts && git commit -m "feat: add frozen grant milestones"`

---

### Task 2: Evidence binding and replay-safe submissions

**Files:**
- Test: `packages/contracts/tests/test_evidence.py`
- Modify: `packages/contracts/grantgate.py`

**Interfaces:**
- Produces `_parse_commit_url(url: str, expected_repo: str) -> tuple[str, str]`, returning canonical URL and lowercase SHA or raising.
- Produces `submit_evidence(id: u256, commit_url: str, summary: str) -> None` for the assigned builder only.
- Produces `resubmit_evidence(id: u256, commit_url: str, summary: str) -> None` from `REJECTED` only.
- Stores `evidence_version`, `review_round`, `submitted_at`, `commit_url`, `commit_sha`, `summary`, and per-milestone used SHA keys.

- [ ] **Step 1: Write canonical URL RED tests**

Accept exactly:

```text
https://github.com/open-labs/ledger/commit/0123456789abcdef0123456789abcdef01234567
```

Reject HTTP, alternate hosts, uppercase/incorrect owner or repo, userinfo, ports, queries, fragments, backslashes, encoded separators, short/long/nonhex SHAs, extra path segments, missing summary, summary over 1,000 characters, and submission at/after deadline.

- [ ] **Step 2: Run RED**

Run: `pnpm test:contract -- test_evidence.py -q`

Expected: FAIL because evidence parsing/submission is absent.

- [ ] **Step 3: Implement minimal URL parsing and submission storage before judgment**

Use structural string parsing inside GenVM; do not resolve DNS or accept redirects. Normalize only the SHA to lowercase; require the owner/repository spelling to equal the frozen values. Fence removal must replace the exact prompt boundary markers used later.

- [ ] **Step 4: Write replay/auth/state RED tests**

Tests must cover outsider/sponsor submission, unknown milestone, cancelled/accepted milestone, same SHA replay, second `submit_evidence`, `resubmit_evidence` outside `REJECTED`, fourth evidence version, and atomic unchanged state when judgment raises before finalization.

- [ ] **Step 5: Implement version/attempt/state guards**

`submit_evidence` accepts only version zero from `OPEN`. `resubmit_evidence` accepts only `REJECTED`, before deadline, with version below 3 and a SHA never used by that milestone. Every accepted call increments evidence version once and initializes review round to 1; counter/state changes rely on transaction atomicity.

- [ ] **Step 6: Run GREEN and commit**

Run: `pnpm test:contract -- test_evidence.py -q`

Expected: PASS.

Commit: `git add packages/contracts/grantgate.py packages/contracts/tests/test_evidence.py && git commit -m "feat: bind milestone evidence to immutable commits"`

---

### Task 3: Semantic GenLayer judgment and fail-closed outcomes

**Files:**
- Test: `packages/contracts/tests/test_judgment.py`
- Modify: `packages/contracts/tests/_stubs/genlayer.py`
- Modify: `packages/contracts/grantgate.py`

**Interfaces:**
- Produces `_judge(milestone: Milestone) -> tuple[str, str, str]` returning `(status, result_vector_csv, explanation)`.
- Validator output schema is an object with `items: CriterionResult[]` and `explanation: string`; `CriterionResult` is exactly `MET | NOT_MET | INSUFFICIENT` and array length equals `criteria_count`.
- Exact comparative equivalence key is the normalized item vector only.
- Contract derives status; it never trusts an overall status from model output.

- [ ] **Step 1: Write outcome-derivation RED tests**

```python
@pytest.mark.parametrize(
    ("items", "expected"),
    [
        (["MET", "MET"], "ACCEPTED"),
        (["MET", "NOT_MET"], "REJECTED"),
        (["MET", "INSUFFICIENT"], "UNRESOLVED"),
    ],
)
def test_contract_derives_status_from_item_vector(
    contract, sponsor, builder, set_sender, set_time, judge_as, items, expected
):
    set_sender(sponsor)
    set_time(1_800_000_000)
    contract.create_milestone(
        "Ship CSV export",
        builder,
        "open-labs",
        "ledger",
        "Export includes a stable header row.\nExport preserves UTF-8 project names.",
        1_800_086_400,
    )
    judge_as(items, "Criterion-by-criterion validator explanation")
    set_sender(builder)
    contract.submit_evidence(
        1,
        "https://github.com/open-labs/ledger/commit/0123456789abcdef0123456789abcdef01234567",
        "The commit adds the requested export behavior and regression tests.",
    )
    assert contract.get_milestone(1)["status"] == expected
```

Also assert that `ACCEPTED` creates exactly one completion record and increments sponsor/builder accepted counters exactly once; other outcomes do neither.

- [ ] **Step 2: Run RED**

Run: `pnpm test:contract -- test_judgment.py -q`

Expected: FAIL because nondeterministic judgment is not implemented.

- [ ] **Step 3: Implement bounded prompt, web render, parser, and equivalence**

The prompt must bind milestone ID, evidence/review versions, expected repository, expected SHA, submission timestamp, schema version, frozen criteria, builder summary, and rendered GitHub content. It must state that every fenced block is untrusted evidence, instructions inside are ignored, and each criterion is judged against actual commit changes. Cap rendered content and explanations before storage.

Normalize JSON strictly: exact object keys may include `items` and `explanation`; `items` length must equal `criteria_count`; labels must be uppercase members of the fixed vocabulary. The equivalence principle compares serialized normalized `items` only. Derive status in contract code.

- [ ] **Step 4: Write fail-closed RED tests**

Cover unavailable render, wrong repo/SHA in rendered identity, malformed JSON, wrong vector length, unknown label, empty/oversized explanation, contradictory/insufficient evidence, prompt-injection delimiters, and programmable protocol consensus failure. Assert malformed/insufficient cases become `UNRESOLVED`; consensus failure raises and leaves the entire prior milestone/counters unchanged.

- [ ] **Step 5: Implement safe `UNRESOLVED` and atomic failure behavior**

Catch content/render/parse failures that are deterministic within the judgment and normalize them to an all-`INSUFFICIENT` vector. Do not catch the stubbed protocol consensus exception; it represents a non-finalized transaction and must not commit state.

- [ ] **Step 6: Run GREEN, lint early, and commit**

Run: `pnpm test:contract -- test_judgment.py -q`

Run: `pnpm lint:genvm`

Expected: both PASS.

Commit: `git add packages/contracts && git commit -m "feat: judge commit milestones by validator consensus"`

---

### Task 4: Retry, views, indexes, and frozen-contract guarantees

**Files:**
- Test: `packages/contracts/tests/test_retries.py`
- Test: `packages/contracts/tests/test_views.py`
- Test: `packages/contracts/tests/test_lifecycle.py`
- Test: `packages/contracts/tests/test_frozen.py`
- Modify: `packages/contracts/grantgate.py`

**Interfaces:**
- Produces `retry_review(id: u256) -> None`, callable by sponsor or builder from `UNRESOLVED` after `RETRY_COOLDOWN_SECONDS = 300` and before deadline.
- Produces views `get_config`, `get_milestone`, `get_sponsor_milestone_count`, `get_builder_milestone_count`, `get_sponsor_milestones(address, offset, limit)`, `get_builder_milestones(address, offset, limit)`, and `get_actor_stats(address)`.
- Pagination limit is 50; invalid offsets return an empty list and invalid limits revert.

- [ ] **Step 1: Write retry RED tests**

Test sponsor/builder success on the same evidence version, review round increment, outsider rejection, early cooldown, deadline, non-`UNRESOLVED`, fourth review, repeated/concurrent retry, accepted terminal state, and no double accepted counter.

- [ ] **Step 2: Run RED, implement minimal retry, run GREEN**

Run: `pnpm test:contract -- test_retries.py -q`

Expected before code: FAIL for absent method. Expected after code: PASS.

- [ ] **Step 3: Write exact view-shape and index RED tests**

`get_milestone` must return stable snake_case primitive fields including `id`, actors, title, repo, criteria, `criteria_count`, deadline/timestamps, status, evidence/review versions, URL/SHA/summary, result vector, explanation, and completion timestamp. Actor stats contain created/assigned/accepted/rejected/unresolved counts. Test multiple actors and page boundaries 0, 49, 50, 51.

- [ ] **Step 4: Implement indexes/views and pass tests**

Run: `pnpm test:contract -- test_views.py -q`

Expected: PASS.

- [ ] **Step 5: Add lifecycle and immutability tests**

Lifecycle covers create → rejected submission → different-SHA accepted resubmission → final readback. Error lifecycle covers create → unresolved → early retry revert → cooled retry unresolved → unchanged completion count. Frozen tests introspect public write entrypoints and assert the exact set is `create_milestone`, `cancel_milestone`, `submit_evidence`, `resubmit_evidence`, `retry_review`; search source for forbidden upgrade/proxy/delegate/owner setters and prove no actor can rewrite a terminal record.

- [ ] **Step 6: Run complete direct suite and commit**

Run: `pnpm test:contract`

Run: `pnpm lint:genvm`

Expected: all direct tests PASS; linter PASS.

Commit: `git add packages/contracts && git commit -m "test: cover retries views and frozen recovery"`

---

### Task 5: Shared contract schema and strict cross-language parsing

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/vitest.config.ts`
- Test: `packages/shared/src/index.test.ts`
- Create after RED: `packages/shared/src/index.ts`

**Interfaces:**
- Produces `MilestoneStatus`, `CriterionResult`, `Milestone`, `ActorStats`, `ContractConfig`.
- Produces `parseMilestone`, `parseMilestoneList`, `parseActorStats`, `parseContractConfig`, `splitCriteria`, `splitResultVector`, `isCanonicalCommitUrl`.
- Numeric chain values accept safe `number`, decimal `string`, or `bigint` and reject unsafe/negative identifiers.

- [ ] **Step 1: Configure the shared package and write parser RED tests**

Use the exact primitive dictionaries asserted by `test_views.py` as fixtures. Test all five statuses, all three criterion labels, bigint/string/number normalization, missing fields, wrong statuses, mismatched criterion/result counts, invalid addresses, unsafe IDs, and canonical URL vectors mirrored from Python tests.

- [ ] **Step 2: Run RED**

Run: `pnpm test:shared`

Expected: FAIL because parser exports do not exist.

- [ ] **Step 3: Implement minimal strict types/parsers/validators**

Parsers return `null` for absent milestones and throw `ContractShapeError` for a present malformed record. Lists drop nothing silently: one malformed item fails the whole read so the UI cannot present partial authoritative history.

- [ ] **Step 4: Run GREEN/build and commit**

Run: `pnpm test:shared`

Run: `pnpm --filter @grantgate/shared build`

Expected: PASS.

Commit: `git add packages/shared pnpm-lock.yaml && git commit -m "feat: add strict contract read schema"`

---

### Task 6: Real wallet, contract client, and transaction/readback state machine

**Files:**
- Create: `apps/web/package.json` and web tool configuration files
- Test: `apps/web/src/lib/genlayer.test.ts`
- Test: `apps/web/src/lib/contract.test.ts`
- Test: `apps/web/src/lib/tx.test.ts`
- Test: `apps/web/src/lib/wallet.test.tsx`
- Create after RED: `apps/web/src/lib/genlayer.ts`, `contract.ts`, `tx.ts`, `wallet.tsx`, `format.ts`
- Create: `apps/web/src/hooks/useGrantGate.ts`

**Interfaces:**
- `reads`: config, milestone, sponsor/builder pages, actor stats.
- `writes`: create, cancel, submit, resubmit, retry with exact contract method names.
- `TxPhase = DISCONNECTED | SIGNING | PENDING | FINALIZED | SUCCESS | ERROR | READBACK`.
- `executeWrite(spec)` returns `{ hash, receipt, readback }` only after final receipt, execution success, and authoritative refetch.

- [ ] **Step 1: Write RED tests for configuration and typed calldata**

Test missing/invalid `VITE_GRANTGATE_ADDRESS`, read-only client without account, address encoding, invalid IDs, exact function names/args, correct network assertion before every write, and account-specific client cache reset on disconnect/account change.

- [ ] **Step 2: Run RED, then implement network/contract wrappers**

Run: `pnpm test:web -- src/lib/genlayer.test.ts src/lib/contract.test.ts`

Expected before code: FAIL. Implement against `genlayer-js`, using Studionet by default and Asimov only when configured. No dummy contract address is accepted.

- [ ] **Step 3: Write transaction reducer RED tests**

Assert the exact legal phase order `SIGNING → PENDING → FINALIZED → SUCCESS → READBACK`; rejected wallet goes to `ERROR` without a hash; protocol timeout from `PENDING` goes to `ERROR`; finalized receipt with failed execution goes `FINALIZED → ERROR`; readback mismatch goes `SUCCESS → ERROR`; duplicate callbacks do not advance twice.

- [ ] **Step 4: Implement receipt and execution checks**

Wait for `TransactionStatus.FINALIZED`. Inspect the receipt's execution status/result using the installed `genlayer-js` shape discovered from its types. Treat finality and execution as separate assertions. Refetch until the expected milestone version/status is observed or a bounded readback timeout occurs.

- [ ] **Step 5: Write wallet RED tests and implement provider state**

Cover no provider, late provider injection, user rejection code `4001`, pending request `-32002`, wrong chain, account change, disconnect, and Studionet-only guest burner persistence. Never log or render a guest private key.

- [ ] **Step 6: Add query/mutation reconciliation and run GREEN**

`useGrantGate` may optimistically show only transaction phase, never an optimistic contract status. On success it invalidates config, milestone, both actor indexes, and stats; it renders only parsed readback.

Run: `pnpm test:web -- src/lib src/hooks`

Run: `pnpm --filter @grantgate/web typecheck`

Expected: PASS.

Commit: `git add apps/web packages/shared pnpm-lock.yaml && git commit -m "feat: connect wallet writes to authoritative readback"`

---

### Task 7: Responsive workflow UI and frontend integration coverage

**Files:**
- Test: `apps/web/src/App.test.tsx`
- Test: `apps/web/src/pages/CreateMilestonePage.test.tsx`
- Test: `apps/web/src/pages/MilestonePage.test.tsx`
- Test: `apps/web/src/pages/DashboardPage.test.tsx`
- Create: `apps/web/src/main.tsx`, `App.tsx`, `index.css`, `test/setup.ts`
- Create: `apps/web/src/components/AppShell.tsx`, `WalletButton.tsx`, `TxTimeline.tsx`, `StatusBadge.tsx`, `CriteriaPanel.tsx`, `EmptyState.tsx`, `ErrorPanel.tsx`
- Create: `apps/web/src/pages/HomePage.tsx`, `CreateMilestonePage.tsx`, `DashboardPage.tsx`, `MilestonePage.tsx`, `ArchitecturePage.tsx`
- Create: `apps/web/public/_redirects`, `vercel.json`

**Interfaces:**
- Pages consume only wallet state and `useGrantGate` queries/mutations.
- Forms call the exact typed writes; detail pages render exact transaction and contract explorer links.
- Responsive targets: 360×800, 768×1024, and 1440×900 without horizontal overflow.

- [ ] **Step 1: Write app-state RED tests**

Render and assert distinct accessible content for disconnected wallet, signing, pending consensus, finalized, execution success, execution error, readback confirmed, read error, and each contract status. Assert action buttons are absent or disabled for unauthorized actors and terminal states.

- [ ] **Step 2: Run RED**

Run: `pnpm test:web -- src/App.test.tsx src/pages`

Expected: FAIL because UI components/pages are absent.

- [ ] **Step 3: Build the minimal route shell and design system**

Implement the approved warm-off-white/ink/navy/acid-green visual direction with CSS variables, visible focus rings, WCAG-readable contrast, reduced-motion support, semantic headings/labels/live regions, compact cards, monospace SHA/address treatments, and no BrickProof copy/layout/assets.

- [ ] **Step 4: Implement creation/dashboard/detail workflows**

Creation collects title, builder address, GitHub owner/repo, 1–5 criteria, and deadline. Detail lets the assigned builder submit/resubmit and sponsor/builder retry only when contract state permits. Dashboard queries both roles and deduplicates milestones by ID. All links use safe canonical URLs and explorer builders.

- [ ] **Step 5: Add deterministic frontend-to-contract-shape integration test**

The test adapter must feed exact dictionaries from direct-contract fixtures through shared parsers, query hooks, pages, form writes, transaction reducer, cache invalidation, and readback. It may control transport responses but may not bypass the contract wrapper or inject a fake success directly into UI state.

- [ ] **Step 6: Run frontend suite, typecheck, build, and commit**

Run: `pnpm test:web`

Run: `pnpm typecheck`

Run: `pnpm build`

Expected: all PASS with no console errors or React warnings.

Commit: `git add apps/web vercel.json pnpm-lock.yaml && git commit -m "feat: deliver responsive GrantGate workflow"`

---

### Task 8: Deployment manifest, live E2E, README, and fixed evidence templates

**Files:**
- Test: `packages/contracts/tests/test_manifest_script.py`
- Create: `packages/contracts/scripts/deploy.mjs`
- Create: `packages/contracts/scripts/e2e.mjs`
- Create: `README.md`
- Create: `docs/recovery.md`
- Create: `docs/evidence/proof-matrix.md`
- Modify: `.env.example`, `.gitignore`, `package.json`, `vercel.json`

**Interfaces:**
- Deploy env: `DEPLOYER_PRIVATE_KEY`, `GENLAYER_NETWORK`; Studionet may generate an ephemeral deployer only when the user confirms that exact wallet behavior.
- Frontend env: `VITE_GRANTGATE_ADDRESS`, `VITE_GENLAYER_NETWORK`.
- Hosting env: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` when already configured.
- Manifest fields: `network`, `chainId`, `contractAddress`, `deploymentTransactionHash`, `explorerAddressUrl`, `explorerTransactionUrl`, `sourceSha256`, `constructorArgs`, `classification`, `deployerAddress`, `deployedAt`, `gitCommit`.

- [ ] **Step 1: Write manifest/deploy-script RED tests**

Use a stub client to prove the script reads the exact contract file, computes SHA-256, refuses unsupported networks/unfunded required wallets, waits for finalization, checks execution success, reads `get_config` from the deployed address, and writes no private key/token. Assert a failed/timeout deployment writes no success manifest.

- [ ] **Step 2: Run RED, implement deploy script, run GREEN**

Run: `pnpm test:contract -- test_manifest_script.py -q`

Expected before code: FAIL. Expected after implementation: PASS.

- [ ] **Step 3: Implement idempotent live E2E script**

The script creates a sponsor and builder only from environment or generated Studionet guest accounts, prints addresses but never keys, creates one milestone, submits a public commit selected for the frozen criteria, waits for `FINALIZED`, checks execution `SUCCESS`, reads the exact milestone back, and records hashes/statuses to `work/`-ignored local evidence. It also sends one unauthorized call and proves the transaction does not alter milestone state. Resume logic discovers IDs from pre/post counts and refuses concurrent reuse of the same run ID.

- [ ] **Step 4: Write concise README and recovery/evidence documents**

README sections are: problem/trust decision, architecture, setup, environment table, contract methods/state, tests, deploy, Vercel, usage, `INTENTIONALLY_FROZEN` recovery link, security/secret handling, and known limitations. `docs/recovery.md` states new-deployment migration and legacy read-only behavior. The proof matrix has the final schema but no invented hashes or URLs; it remains explicitly marked incomplete until live verification fills it.

- [ ] **Step 5: Run full local verification and secret/repository hygiene checks**

Run:

```text
pnpm lint:genvm
pnpm typecheck
pnpm build
pnpm test
git diff --check
git status --short
```

Scan tracked/staged/untracked text for private-key/token patterns and inspect the staged file list. Ensure `.env`, local journals, `node_modules`, caches, dist, raw task/research, and local instruction files are ignored.

- [ ] **Step 6: Commit the locally verified release candidate**

Commit: `git add . && git commit -m "chore: prepare verified GrantGate release"`

Record the exact commit and source SHA locally. Do not push or deploy in this step.

---

### Task 9: Action-time confirmations, live deployment, browser verification, and delivery

**Files:**
- Modify only after real evidence exists: `deployments/<network>.json`, `docs/evidence/proof-matrix.md`, `README.md`

**Interfaces:**
- Consumes the locally verified release commit and environment configuration.
- Produces exact public repository URL/commit, Studionet contract evidence, Vercel URL, live accepted/error transactions, browser readback, and known limitations.

- [ ] **Step 1: Perform read-only identity checks**

Check Git author, active GitHub CLI account, desired repository owner/name and remote, deployment wallet address/network/balance without exposing its key, and Vercel authenticated user/team/project plus token presence without printing the token.

- [ ] **Step 2: Stop and obtain user confirmation for the exact external actions**

State the identities discovered and the exact proposed GitHub repository creation/push, contract network/wallet deployment, and Vercel team/project deployment. Do not execute any of the three actions until the user confirms this current identity/action bundle.

- [ ] **Step 3: Deploy the contract and verify source-bound readback**

After confirmation, deploy once, wait for `FINALIZED`, assert execution `SUCCESS`, read `get_config`, compare manifest/source hash to the committed file, and verify explorer address/transaction pages. Commit the real secret-free manifest and exact evidence; if this changes the source commit, source hash must still match and the evidence commit must be recorded separately.

- [ ] **Step 4: Push the exact repository commit**

Re-run staged/untracked/secret hygiene, push to the confirmed GitHub owner/repository, and verify the remote commit equals local `HEAD`.

- [ ] **Step 5: Deploy Vercel with confirmed environment and verify routes**

Use `VERCEL_TOKEN` from the environment without printing it. Set only public frontend address/network values. Verify `/`, `/dashboard`, `/milestones/new`, a real `/milestones/<id>`, `/architecture`, and deep-link refreshes.

- [ ] **Step 6: Exercise the real app and important failure branch**

Through the deployed frontend, connect a real/Studionet guest wallet, complete one create-and-submit transaction that reaches `FINALIZED`, execution `SUCCESS`, and matching contract readback. Exercise one unauthorized or invalid-transition branch and verify the contract state remains unchanged. Inspect console errors, responsive layouts at 360/768/1440 widths, transaction explorer pages, deployed address activity, and source equality.

- [ ] **Step 7: Run final fresh verification and fill fixed evidence package**

Re-run lint, typecheck/build, full direct/shared/web tests, and live E2E. Fill proof matrix rows only from observed hashes/readback. List remaining limitations, including Studionet resets, public-GitHub-only evidence, semantic consensus variability, no escrow, and intentionally frozen migration.

- [ ] **Step 8: Deliver without overclaiming**

Report repository URL and exact commit, Vercel URL, contract address/deployment transaction/explorer, test counts/results, proof matrix, source hash, and limitations. If any live step is missing or unverifiable, label the task incomplete and identify the missing evidence rather than claiming completion.

---

## Plan self-review result

- Every approved trust/evidence/state/recovery requirement maps to Tasks 1–4.
- Contract-to-frontend authoritative state and distinct transaction phases map to Tasks 5–7.
- Deploy, manifests, secrets, live happy/error paths, browser verification, and fixed evidence map to Tasks 8–9.
- No escrow/custody code is planned because the approved MVP has no value transfer.
- All production behavior begins with a failing test; configuration-only setup is folded into the first behavior that requires it.
- Public external actions are isolated behind the action-time confirmation in Task 9.
