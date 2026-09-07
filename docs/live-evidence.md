# Live evidence

Canonical repository: `tranhop26/grantgate`
Public-proof performance release: [`2a77eaca48251c032333ad2d14088897546bc413`](https://github.com/tranhop26/GrantGate/commit/2a77eaca48251c032333ad2d14088897546bc413)

| Claim | Fixed evidence |
|---|---|
| Frozen contract source | [`packages/contracts/grantgate.py`](../packages/contracts/grantgate.py), Git blob `15d4632befd4025ff83f3738656a8d5be9f7387c`, LF-content SHA-256 `8f8b38a95d6082807cd621594142420e25d0b9ead6b346a9ebaa2fb59498c393` |
| Studionet deployment | [Contract `0xA6eE55C2214274474546d8259C893d4540742342`](https://explorer-studio.genlayer.com/address/0xA6eE55C2214274474546d8259C893d4540742342); [transaction `0xa4cb6ae9e7a3bdcde3acfc6a012c912b97125992ed77fbc1f50df94198d95e98`](https://explorer-studio.genlayer.com/tx/0xa4cb6ae9e7a3bdcde3acfc6a012c912b97125992ed77fbc1f50df94198d95e98) |
| Production frontend | [`https://grantgate.vercel.app`](https://grantgate.vercel.app), Vercel deployment `dpl_6Vir4zdNKg6DEY15ZYARyTeqmLo7`, deployed `2026-09-07`; production environment binds the frozen Studionet contract address and network |
| Verification | 120 tests pass; ESLint and 3 GenVM checks pass; typecheck passes; production build passes with 550 transformed modules |
| Live accepted proof | Milestone #7 reads `ACCEPTED`, evidence version `1`, review round `1`, and criterion vector `MET`; [successful review transaction](https://explorer-studio.genlayer.com/tx/0x49cc510fec57224390a8f42a1480f1f8e4a7ddc2745fdc7756a37cda7a9afdd9) is finalized with GenVM `SUCCESS` and consensus `Accepted` |
| Live unresolved proof | Milestone #3 reads `UNRESOLVED` with criterion vector `INSUFFICIENT` and explains that rendered evidence did not match the bound repository and commit |
| Replay protection | [Repeated submission](https://explorer-studio.genlayer.com/tx/0xfc62b8c277b83e83c9c856c22614032ffd46be3f4c3ae77ae1cde38954514c8e) is finalized with GenVM `ERROR` and consensus `Accepted`; milestone #7 remains accepted at evidence version `1` |
| Performance release | Route-level lazy loading plus separate React, query, GenLayer, Viem, and cryptography chunks; largest minified chunk `254.18 kB` (`74.21 kB` gzip), down from the prior monolithic app chunk of about `775.9 kB` |
| Fixed manifests | [`deployments/studionet.json`](../deployments/studionet.json) and [`deployments/studionet-e2e.json`](../deployments/studionet-e2e.json) |

The live RPC returns the same contract source with CRLF line endings: its raw SHA-256 is `0cb38ef34287c66d068812465e3d0c903c461038171afb91519df8a4d5b6b002`; normalizing only CRLF to LF yields the manifest and committed-content hash `8f8b38a…c393`. This records the transport newline distinction instead of treating the SHA-256 as a Git object identifier.

The release production site was checked anonymously at `/`, `/milestones/7`, and `/milestones/3`; the route fallback rendered during lazy loading, both live outcomes loaded without a wallet, milestone deep links survived direct navigation, and the browser console recorded no errors.

Known limitations remain explicit: Studionet is Preview infrastructure using simulated GEN; the public showcase is limited to milestones #7 and #3; only public GitHub commits are supported; and the contract has no custody, appeal system, owner, proxy, upgrade key, or admin override. Milestones #3–#6 remain `UNRESOLVED` with `INSUFFICIENT`; their fixed readbacks show that the rendered evidence did not satisfy the bound repository/commit checks, without overstating a single renderer cause.
