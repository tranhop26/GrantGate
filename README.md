# GrantGate

GrantGate is a GenLayer MVP for software-grant milestones. A sponsor freezes a public GitHub repository, builder, deadline, and measurable criteria. The builder binds one immutable commit. GenLayer validators inspect that commit and the Intelligent Contract records `ACCEPTED`, `REJECTED`, or `UNRESOLVED`.

GrantGate is **Preview on Studionet**. Studionet GEN is simulated value, not production settlement.

The sponsor and builder cannot safely judge their own dispute. The contract is the source of truth: the frontend only submits calls and renders contract readback. There is no escrow or token custody in this MVP.

## Trust and state

- `OPEN` — criteria are frozen; sponsor may cancel and the assigned builder may submit.
- `ACCEPTED` — every criterion is `MET`; the completion record and actor stats are finalized.
- `REJECTED` — at least one criterion is `NOT_MET`; the builder may bind another commit within limits.
- `UNRESOLVED` — evidence is missing, contradictory, malformed, or insufficient; sponsor or builder may retry the same evidence after cooldown.
- `CANCELLED` — sponsor cancelled before evidence; no later submission is allowed.

Protocol consensus failure propagates without mutating state. Replay, wrong-role calls, invalid transitions, malformed inputs, exhausted retries, and late submissions are rejected by the contract.

`packages/contracts/grantgate.py` is **INTENTIONALLY_FROZEN**: no owner, proxy, upgrade key, admin override, or replacement path is advertised. Recovery is deliberately limited to same-evidence retry from `UNRESOLVED`, different-commit resubmission from `REJECTED`, and sponsor cancellation while `OPEN`.

See [frozen recovery](docs/recovery.md), the [live proof matrix](docs/proof-matrix.md), and the [fixed live evidence bundle](docs/live-evidence.md).

Live deployment: [GrantGate on Vercel](https://grantgate.vercel.app), [Studionet contract](https://explorer-studio.genlayer.com/address/0xA6eE55C2214274474546d8259C893d4540742342), and [deployment transaction](https://explorer-studio.genlayer.com/tx/0xa4cb6ae9e7a3bdcde3acfc6a012c912b97125992ed77fbc1f50df94198d95e98). The checked-in manifests record the frozen source hash, deployment readback, live `UNRESOLVED` decision, and rejected replay.

## Architecture

```text
React/Vite UI → strict shared parsers → genlayer-js → GrantGate contract
                                                    ├─ frozen milestone state
public GitHub commit → GenLayer validators ─────────┤
                                                    └─ decision + readback
```

- `packages/contracts` — Intelligent Contract, direct tests, deploy and live E2E scripts.
- `packages/shared` — fail-closed contract response parsers and canonical URL rules.
- `apps/web` — responsive wallet UI, transaction lifecycle, and authoritative readback.
- `deployments` — generated deployment and live evidence manifests (after execution).

## Setup and verification

Requirements: Node 22+, pnpm 10.18.2, Python 3.12+, `pytest`, and `genvm-linter` 0.11.

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

`pnpm test` builds the shared package first, then runs every workspace test suite sequentially. To run the app, copy `.env.example` to `.env` and set the public contract configuration; tests do not require private keys.

Environment variables:

- `VITE_GRANTGATE_ADDRESS` — deployed contract address; empty means live functions stay disabled.
- `VITE_GENLAYER_NETWORK` — `studionet` or `testnet-asimov`.
- `DEPLOYER_PRIVATE_KEY` — deployer/sponsor key; never commit or print it.
- `E2E_BUILDER_PRIVATE_KEY` — optional on Studionet, required on charged networks.
- `E2E_COMMIT_URL`, `E2E_CRITERION` — real immutable public evidence for the live test.
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — Vercel deployment credentials/target.

## Deploy

Run the read-only preflight first. Confirm the displayed network, deployer wallet, Git commit, GitHub account/repository, and Vercel team/project before any external action.

```bash
pnpm deploy:contract -- studionet
pnpm deploy:contract -- studionet --execute
pnpm e2e:live -- studionet
pnpm e2e:live -- studionet --execute
pnpm exec vercel deploy --prod --token "$VERCEL_TOKEN"
```

The deploy script waits for `FINALIZED`, requires successful execution, reads `get_config`, and writes `deployments/<network>.json`. Live E2E creates a real milestone, submits immutable evidence, attempts a replay, confirms unchanged readback, and writes `deployments/<network>-e2e.json`.

## Use

### Verify live proof — no wallet required

1. Open the public proof gallery on [GrantGate](https://grantgate.vercel.app).
2. Confirm milestone #7 is `ACCEPTED` with criterion result `MET`, then confirm milestone #3 is `UNRESOLVED` with `INSUFFICIENT` evidence. Both cards are contract readbacks, not fixtures.
3. Open milestone #7 and the linked successful review and rejected replay transactions. The replay fails while the accepted readback remains unchanged at evidence version 1.

### Try a write — funded injected wallet required

1. Connect MetaMask or another injected wallet that is funded on Studionet. In [GenLayer Studio Accounts](https://studio.genlayer.com/contracts), use the account selector to transfer simulated GEN from a pre-funded Studionet account to the connected wallet address. Do not use a faucet.
2. As sponsor, create a milestone with lowercase `owner/repo`, a builder address, 1–5 criteria, and a future deadline.
3. Switch the injected wallet to that assigned builder, then submit a canonical URL containing a full lowercase 40-character commit SHA.
4. Wait through signing, pending, finalized, execution success, and readback; inspect the criterion vector and terminal status.

## Evidence map

| Actor | Action | Contract method | Transaction | State | Readback |
|---|---|---|---|---|---|
| Sponsor | Freeze terms | `create_milestone` | `deployments/*-e2e.json:create` | `OPEN` | id, sponsor, builder, criteria |
| Builder | Bind commit and request review | `submit_evidence` | `deployments/*-e2e.json:submit` | `ACCEPTED` / `REJECTED` / `UNRESOLVED` | SHA, vector, explanation |
| Builder | Repeat consumed submission | `submit_evidence` | `deployments/*-e2e.json:replay` | `ERROR` | prior version/status unchanged |

## Remaining limits

- Public GitHub repositories only; private repository authentication is intentionally out of scope.
- One repository and up to five criteria per milestone; three evidence versions and three review rounds.
- No payments, escrow, appeals, or upgrade path.
- Validator web access can produce `UNRESOLVED`; it is a safe terminal decision with bounded recovery, not hidden success.
- The public showcase is deliberately limited to verified milestone #7 and fail-safe milestone #3; arbitrary milestone ids are not promoted as review evidence.
