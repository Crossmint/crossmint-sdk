---
"@crossmint/wallets-sdk": patch
---

`wallet.send` now serializes the full API error response into `TransactionNotCreatedError` instead of only the `message` field, so failed transfers surface the structured `error` object (`reason`, `revert.reason`, `revert.explorerLink`, `revert.simulationLink`, Solana `logs`).
