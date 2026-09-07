# GrantGate Public Proof and Performance Design

**Date:** 2026-09-07
**Milestone:** 1 of a staged GrantGate upgrade roadmap
**Contract impact:** None. The frozen Studionet contract and its address remain unchanged.

## Objective

Make GrantGate's existing on-chain evidence easier and faster for an anonymous reviewer to verify. The release will expose representative `ACCEPTED` and `UNRESOLVED` outcomes plus a rejected replay, while reducing the JavaScript required for the public, wallet-free proof path.

## Baseline

- Production: `https://grantgate.vercel.app`
- Frozen Studionet contract: `0xA6eE55C2214274474546d8259C893d4540742342`
- Public accepted proof: milestone `7`, status `ACCEPTED`, result vector `MET`
- Safe-failure proof: milestones `3` through `6`, status `UNRESOLVED`, result vector `INSUFFICIENT`
- Replay proof: transaction `0xfc62b8c277b83e83c9c856c22614032ffd46be3f4c3ae77ae1cde38954514c8e`
- Verification baseline: 113 tests; lint, GenVM lint, typecheck, and production build pass
- Known performance limitation: the main production JavaScript chunk is approximately 776 kB minified

## Scope

### Public proof gallery

Replace the single-outcome presentation with a compact gallery backed by live contract reads. It will contain:

1. Milestone `7` as the positive `ACCEPTED / MET` proof.
2. One fixed milestone from `3` through `6` as the safe `UNRESOLVED / INSUFFICIENT` proof, selected only after a fresh read confirms its expected state.
3. The rejected replay transaction, paired with milestone `7` readback to show that the terminal state and evidence version did not change.

Each card will show the milestone id, contract status, criterion result, concise explanation, immutable commit where present, and relevant milestone or Explorer links. The UI will label Studionet as Preview infrastructure and simulated GEN as non-production value.

The gallery must fail closed. A missing, malformed, mismatched, or unavailable read will produce an explicit unavailable state; it must never substitute fixture data or imply that a proof was verified.

### Public-read performance

The anonymous proof path must not eagerly load write-only wallet and transaction dependencies. Route-level code splitting will lazy-load secondary pages. Wallet connection and signed transaction code will be loaded only when the user requests a write action.

The implementation will preserve existing public contract reads and source-of-truth behavior. Performance work must not weaken address validation, network selection, permission checks, transaction finality checks, or authoritative readback.

The release target is to eliminate the current single 776 kB application chunk and produce independently cached chunks for public UI, routes, and write-only GenLayer/wallet functionality. Exact post-build sizes will be recorded rather than promised in advance.

## Components and data flow

1. A proof manifest defines the fixed milestone ids and Explorer transactions that are eligible for promotion. It contains identifiers, not verdict fixtures.
2. The live-proof data layer reads each promoted milestone from the configured Studionet contract and parses it through the shared fail-closed schema.
3. A proof-gallery component renders only parsed live readbacks and pairs replay links with the authoritative accepted record.
4. Public routes render without a wallet. Write controls trigger lazy loading of wallet and signed-client code.
5. Existing contract hooks remain the only boundary for reads and writes; no backend or off-chain verdict store is introduced.

## Error handling

- RPC or contract-read failure: show `Live proof unavailable` with a retry action.
- Missing milestone: identify the unavailable milestone id without inventing state.
- Schema mismatch: reject the record and show a compatibility error.
- Expected proof-state mismatch: mark that proof as changed and do not display the expected claim.
- Lazy module failure: show an actionable connection error while public proof remains readable.
- Explorer links remain external evidence and never override contract readback.

## Testing and verification

Development follows red-green-refactor cycles.

- Unit tests cover proof-manifest validation and expected-state matching.
- Component tests cover accepted, unresolved, replay, partial failure, total failure, retry, and anonymous-reader behavior.
- Wallet and permission regression tests prove writes remain gated.
- Build verification checks emitted chunk structure and records exact sizes.
- Full repository gates remain `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check`.
- Browser verification covers `/`, `/milestones/7`, the selected unresolved milestone, `/dashboard`, `/milestones/new`, and `/architecture`, including direct refresh and mobile width.
- Production verification happens only after the exact reviewed commit is pushed and deployed with confirmed GitHub and Vercel identities.

## Documentation and evidence

Update the changelog, README, live evidence bundle, and proof matrix with:

- exact Git commit and Vercel deployment;
- before/after production chunk sizes;
- live links for accepted, unresolved, and replay proofs;
- full test/lint/typecheck/build results;
- unchanged frozen contract address and source hash;
- known limitations, including the lack of custody and appeal.

Prepare the Milestones submission fields in English:

- Title
- Changes & Improvements, below 1,000 characters
- Evidence links containing only the most important public proofs

## Out of scope

- Contract source changes or a new contract deployment
- Appeals, counter-evidence, escrow, custody, payouts, or migration
- Seeding new on-chain records
- Changing the existing frozen contract address or deployment manifests
- Claiming production settlement or a Live network status

These are reserved for later staged milestones, with Appeal Review V2 as the next proposed contract release.

## Release gates

- No GitHub push until the active Git author, GitHub account, repository, branch, and exact commits are confirmed with the user.
- No Vercel production deployment until the active Vercel account, team, project, environment target, and exact proposed deployment are confirmed with the user.
- No completion claim until local checks, browser verification, production verification, and fixed evidence documents all agree.
