---
"@crossmint/wallets-sdk": patch
---

Solana `sendTransaction` with `additionalSigners` can approve a version-1 transaction. The Keypair wrapper now signs the approval message bytes directly, because `@solana/web3.js` cannot serialize a version-1 transaction for `onSign`. Version 0 still goes through `onSign`.
