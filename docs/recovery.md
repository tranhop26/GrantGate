# Frozen-contract recovery

GrantGate is `INTENTIONALLY_FROZEN`. There is no owner, proxy, upgrade call, result setter, or admin override.

- `OPEN`: the sponsor may cancel; the assigned builder may submit before deadline.
- `REJECTED`: the builder may submit a different unused commit, up to three evidence versions.
- `UNRESOLVED`: sponsor or builder may retry the same evidence after 300 seconds, up to three review rounds.
- `ACCEPTED` and `CANCELLED`: terminal and immutable.
- Consensus/receipt failure: read the record again; no UI or backend may infer a state change.

If contract logic must change, deploy a new address and version the frontend configuration. Keep the legacy deployment readable and do not present new-contract state as a migration of old records; no privileged migration path exists.
