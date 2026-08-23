# Evidence bundle recovery design

## Goal

Produce one immutable GitHub commit whose rendered commit page contains both the canonical repository marker `tranhop26/grantgate` and sufficient verifiable production evidence for GrantGate validators. Do not modify or redeploy the `INTENTIONALLY_FROZEN` contract.

## Root cause

The deployed contract checks rendered GitHub text for the contiguous repository identity `owner/repo`. GitHub currently renders its repository heading as `owner / repo`, so milestones #5 and #6 fail closed before semantic evaluation. Unit fixtures use the contiguous form and therefore did not reproduce the live renderer shape.

## Design

Add one concise `docs/live-evidence.md` file containing:

- canonical marker `tranhop26/grantgate`;
- frozen contract path and SHA-256;
- Studionet contract address and deployment transaction links;
- production Vercel URL;
- exact test, lint, typecheck, and build results;
- links to deployment and E2E manifests;
- an explicit note that milestones #5 and #6 were safely `UNRESOLVED` because of renderer mismatch.

Link this file once from the README so the recovery commit diff exposes the evidence bundle. No application, contract, dependency, or deployment configuration changes are permitted.

## Verification and live flow

1. Validate links, source hash, JSON manifests, repository cleanliness, and secret hygiene.
2. Run lint, typecheck, build, and all tests to ensure the documentation-only change does not disturb the release.
3. Create a local commit and stop for action-time GitHub push confirmation.
4. After push, confirm the public commit page visibly contains the canonical marker and evidence.
5. Stop for action-time confirmation, then create milestone #7 bound to that commit, submit it, wait for `FINALIZED` and GenVM execution `SUCCESS`, and verify contract readback in Chrome.
6. Attempt replay only after the main decision, requiring GenVM `ERROR` and identical authoritative readback.

`ACCEPTED` is a target, not an assumption. `REJECTED`, `UNRESOLVED`, consensus failure, or execution error remain authoritative and must be reported as observed.

## Scope and recovery limits

This is a compatibility evidence bundle for the already-frozen deployment, not a silent contract upgrade. Milestone #6 keeps its final retry unused. If the new commit still cannot pass the renderer identity gate, stop and recommend a separately deployed v2 contract rather than adding more evidence workarounds.
