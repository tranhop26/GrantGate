# Evidence Bundle Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish one immutable, renderer-compatible evidence commit and use it in a new GrantGate milestone without modifying the frozen contract.

**Architecture:** A concise repository-native evidence document supplies the contiguous identity marker expected by the deployed contract and maps every production claim to fixed public evidence. README links to it. The existing E2E client then creates and submits milestone #7, waits for consensus and execution, rejects replay, and records authoritative readback.

**Tech Stack:** Markdown, Git/GitHub, Node.js, pnpm, GenLayer JS SDK, GenLayer Studionet, Vercel, Chrome.

## Global Constraints

- Do not modify `packages/contracts/grantgate.py` or redeploy `0xA6eE55C2214274474546d8259C893d4540742342`.
- Keep contract classification `INTENTIONALLY_FROZEN`.
- Never expose or commit `.env`, private keys, tokens, or wallet credentials.
- Treat `ACCEPTED` as a target only; contract readback is authoritative.
- Stop for action-time confirmation before GitHub push and before milestone #7 transactions.
- Do not use milestone #6 review round `3/3`.

---

### Task 1: Renderer-compatible fixed evidence bundle

**Files:**
- Create: `docs/live-evidence.md`
- Modify: `README.md`
- Test: repository commands listed below

**Interfaces:**
- Consumes: `deployments/studionet.json`, `deployments/studionet-e2e.json`, public explorer URLs, `https://grantgate.vercel.app`.
- Produces: a public GitHub commit page containing `tranhop26/grantgate`, production evidence, and an immutable full SHA.

- [ ] **Step 1: Create the evidence document with exact fixed claims**

```markdown
# Live evidence

Canonical repository: `tranhop26/grantgate`

| Claim | Fixed evidence |
|---|---|
| Frozen contract source | `packages/contracts/grantgate.py`, SHA-256 `8f8b38a95d6082807cd621594142420e25d0b9ead6b346a9ebaa2fb59498c393` |
| Studionet deployment | contract `0xA6eE55C2214274474546d8259C893d4540742342`; transaction `0xa4cb6ae9e7a3bdcde3acfc6a012c912b97125992ed77fbc1f50df94198d95e98` |
| Production frontend | `https://grantgate.vercel.app` |
| Verification | lint pass; typecheck pass; build pass; 104 tests pass |

The deployment and E2E manifests contain finalized consensus, GenVM execution, transaction, and readback fields. Milestones #5 and #6 failed closed as `UNRESOLVED` because GitHub rendered `owner / repo` while the frozen contract expects the contiguous marker above.
```

- [ ] **Step 2: Add one README link**

Add `See [live evidence](docs/live-evidence.md).` beside the existing recovery and proof-matrix links.

- [ ] **Step 3: Verify fixed values and hygiene**

Run:

```powershell
rg -n "tranhop26/grantgate|8f8b38a95d6082807cd621594142420e25d0b9ead6b346a9ebaa2fb59498c393|0xA6eE55C2214274474546d8259C893d4540742342|grantgate.vercel.app" docs/live-evidence.md
node -e "JSON.parse(require('node:fs').readFileSync('deployments/studionet.json','utf8')); JSON.parse(require('node:fs').readFileSync('deployments/studionet-e2e.json','utf8'))"
git diff --check
```

Expected: all four evidence anchors are found, both manifests parse, and diff check reports no errors.

- [ ] **Step 4: Run release gates**

Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test`.

Expected: every command exits `0`; contract 46, deployment 9, shared 18, and frontend 31 tests pass.

- [ ] **Step 5: Commit locally**

```powershell
git add README.md docs/live-evidence.md docs/superpowers/plans/2026-08-23-evidence-bundle-recovery.md
git commit -m "docs: add renderer-compatible live evidence"
```

Expected: worktree clean. Stop for user confirmation before `git push origin HEAD:main`.

### Task 2: Public renderer verification and milestone #7

**Files:**
- Modify after live execution: `deployments/studionet-e2e.json`
- Test: public GitHub commit page, GenLayer transaction/readback, production Chrome UI

**Interfaces:**
- Consumes: Task 1 public commit URL and the existing sponsor/builder environment credentials.
- Produces: fixed create, submit, replay transaction hashes and contract-authoritative terminal readback for milestone #7.

- [ ] **Step 1: Verify the public commit page before any transaction**

Open the pushed commit URL and require rendered text to contain `tranhop26/grantgate`, the commit's seven-character prefix, the frozen source hash, contract address, deployment transaction, and Vercel URL.

- [ ] **Step 2: Configure immutable evidence locally**

Set ignored `.env` `E2E_COMMIT_URL` to the exact public commit URL and set:

```text
E2E_CRITERION=The evidence bundle maps the frozen GrantGate source hash and Studionet deployment to the production Vercel frontend with verifiable public links.
```

- [ ] **Step 3: Run read-only preflight and stop for transaction confirmation**

Run `pnpm e2e:live` and verify network `studionet`, contract, sponsor, builder, commit URL, and criterion. Do not use `--execute` until the user confirms the exact milestone #7 action.

- [ ] **Step 4: Execute and verify the live flow**

Run `pnpm e2e:live -- --execute`. Require create and submit consensus `FINALIZED` with GenVM `SUCCESS`; require replay GenVM `ERROR` and deep-equal readback. Accept the contract's observed `ACCEPTED`, `REJECTED`, or `UNRESOLVED` decision without substitution.

- [ ] **Step 5: Verify production UI and evidence manifest**

Open `https://grantgate.vercel.app/milestones/7` in Chrome guest mode. Match status, evidence version, review round, commit SHA, result vector, and explanation to `get_milestone(7)`. Validate `deployments/studionet-e2e.json` and record the exact live hashes.

- [ ] **Step 6: Commit fixed evidence locally and stop before push**

```powershell
git add deployments/studionet-e2e.json docs/proof-matrix.md
git commit -m "docs: record renderer-compatible live decision"
```

Expected: worktree clean. Stop for a fresh user confirmation before pushing the evidence commit to `tranhop26/GrantGate` `main`.
