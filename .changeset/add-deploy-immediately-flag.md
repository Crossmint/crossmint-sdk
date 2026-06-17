---
"@crossmint/wallets-sdk": minor
---

feat: add `deployImmediately` option to `addSigner` for EVM wallets

When adding a signer to an EVM wallet, `deployImmediately` (default: `true`) causes the
signer to be registered on-chain immediately via a transaction, mirroring the Solana/Stellar
behavior. Set to `false` to use the previous lazy signature-request flow.
