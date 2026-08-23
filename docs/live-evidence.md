# Live evidence

Canonical repository: `tranhop26/grantgate`

| Claim | Fixed evidence |
|---|---|
| Frozen contract source | [`packages/contracts/grantgate.py`](../packages/contracts/grantgate.py), SHA-256 `8f8b38a95d6082807cd621594142420e25d0b9ead6b346a9ebaa2fb59498c393` |
| Studionet deployment | [Contract `0xA6eE55C2214274474546d8259C893d4540742342`](https://explorer-studio.genlayer.com/address/0xA6eE55C2214274474546d8259C893d4540742342); [transaction `0xa4cb6ae9e7a3bdcde3acfc6a012c912b97125992ed77fbc1f50df94198d95e98`](https://explorer-studio.genlayer.com/tx/0xa4cb6ae9e7a3bdcde3acfc6a012c912b97125992ed77fbc1f50df94198d95e98) |
| Production frontend | [`https://grantgate.vercel.app`](https://grantgate.vercel.app) |
| Verification | Lint pass; typecheck pass; production build pass; 104 tests pass |
| Fixed manifests | [`deployments/studionet.json`](../deployments/studionet.json) and [`deployments/studionet-e2e.json`](../deployments/studionet-e2e.json) |

The manifests record finalized consensus, GenVM execution, transaction hashes, and authoritative readbacks. Milestones #5 and #6 failed closed as `UNRESOLVED` because GitHub rendered `owner / repo` while the frozen contract expects the contiguous canonical marker above.
