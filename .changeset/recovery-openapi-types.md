---
"@crossmint/wallets-sdk": patch
---

Update the wallets OpenAPI spec so Solana and Stellar wallet creation configs describe a `recovery` list (1-10 signers) alongside the deprecated `adminSigner`, and expose a `RecoverySignerListConfig` API type.
