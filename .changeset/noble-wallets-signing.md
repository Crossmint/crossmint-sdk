---
"@crossmint/wallets-sdk": patch
---

Sign with `@noble/curves` (ed25519) instead of `tweetnacl` in the Solana and Stellar server signers and Solana additional-signer signing. Signatures are byte-for-byte identical. `@noble/curves` is already part of every wallet install through viem and Solana, so this removes `tweetnacl` (about 57 KB minified) from wallet app bundles.
