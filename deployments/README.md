# Deployment evidence

`deploy.mjs --execute` writes `<network>.json` only after finalized deployment and successful `get_config` readback. `e2e.mjs --execute` writes `<network>-e2e.json` only after the live success and replay-rejection checks complete.

These manifests contain public addresses, transaction hashes, source hashes, readbacks, and explorer links. They never contain private keys or tokens.
