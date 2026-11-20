---
"@crossmint/common-sdk-base": patch
"@crossmint/wallets-sdk": patch
---

Log `WalletNotAvailableError` from `walletFactory.getWallet` at warn level instead of error. The `WithLoggerContext` decorator now supports an `expectedErrors` option so decorated methods can declare which error classes represent normal business outcomes (e.g. wallet not found) that should not pollute error-level monitoring.
