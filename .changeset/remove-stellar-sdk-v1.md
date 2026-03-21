---
"@crossmint/wallets-sdk": patch
---

Remove @stellar/stellar-sdk dependency by replacing it with tweetnacl (already a dependency) for ed25519 operations and a local Stellar StrKey encoder ported from open-signer.
