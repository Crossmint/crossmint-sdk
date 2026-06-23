---
"@crossmint/wallets-sdk": patch
---

fix(wallets): support locator-based token matching in balances filter

`wallet.balances(tokens)` now correctly matches tokens requested via chain locators (e.g. `solana:<mint>`, `base-sepolia:<contractAddress>`, `stellar:<contractId>`) in addition to plain symbols.
