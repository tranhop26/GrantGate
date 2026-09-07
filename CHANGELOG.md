# Changelog

## Unreleased

- Expanded the wallet-free home-page proof gallery with verified `ACCEPTED`, fail-safe `UNRESOLVED`, and rejected replay outcomes.
- Added strict expected/readback matching so stale or mismatched RPC data fails closed instead of displaying an expected status.
- Split every application route and separated React, query, GenLayer, Viem, and cryptography dependencies; the largest production chunk fell from about 776 kB to about 254 kB minified.
- Deferred injected-wallet runtime loading until connection or disconnect is requested.
- Made public milestone reads available without connecting a wallet.
- Restricted contract writes to injected wallets with explicit Studionet funding guidance.
- Made the root test workflow deterministic across contract, shared, and web packages.
- Added reusable Explorer logo assets and form-ready submission copy.
- Preserved the intentionally frozen Intelligent Contract without a source or deployment change.
