---
"@crossmint/wallets-sdk": patch
---

fix: wipe server signer secret from memory after key derivation

- After `useSigner()` resolves the server signer derivation, the plaintext master secret is stripped from the recovery config and replaced with an address-only reference
- Non-selected derivation candidate key bytes are securely zeroed
- Signer adapter constructors (EVM, Solana, Stellar) wipe input derived key bytes after constructing their internal key material
- `buildInternalSignerConfig` copies derived key bytes so the cached resolution is not corrupted when adapters wipe their input
