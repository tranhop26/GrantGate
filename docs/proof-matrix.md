# Live proof matrix

Live hashes and readbacks are generated, not hand-written:

| Actor | Action | Method | Transaction | State | Readback source |
|---|---|---|---|---|---|
| Deployer | Deploy frozen source | deploy | `deployments/<network>.json` | `FINALIZED` | `get_config` |
| Sponsor | Freeze milestone | `create_milestone` | `deployments/<network>-e2e.json:create` | `OPEN` | `get_milestone` |
| Builder | Bind immutable commit | `submit_evidence` | `deployments/<network>-e2e.json:submit` | terminal decision | SHA, vector, explanation |
| Builder | Replay consumed call | `submit_evidence` | `deployments/<network>-e2e.json:replay` | `ERROR` | prior version/status unchanged |

The checked-in Studionet manifests instantiate this table with finalized transaction hashes, execution results, and authoritative readbacks.
