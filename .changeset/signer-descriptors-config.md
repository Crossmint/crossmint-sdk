---
"@crossmint/wallets-sdk": patch
---

refactor: introduce SignerDescriptor registry for per-signer-type config shaping

Moves the synchronous per-type `switch` logic out of `wallet.ts` into a `SignerDescriptor` per signer type (`signers/descriptors/`): config validation, internal-config building, and auto-assemblability. `wallet.ts` now dispatches via `getSignerDescriptor(type)`. Internal refactor — no behavior or public API changes.
