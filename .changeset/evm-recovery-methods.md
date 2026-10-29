---
"@crossmint/wallets-sdk": minor
---

Support recovery methods on EVM. `createWallet` sends `recoveryMethods` on EVM chains and accepts more than one. `addRecoveryMethod` and `removeRecoveryMethod` work on EVM wallets and send the wallet's chain, which the API requires on EVM. A single recovery method passed as `recovery` still goes under `adminSigner`.
