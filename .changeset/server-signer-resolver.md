---
"@crossmint/wallets-sdk": patch
---

refactor: extract ServerSignerResolver from wallet.ts

Moves server-signer key derivation, the dual primary/legacy derivation caches, and the secure-wipe discipline out of `wallet.ts` into a dedicated `ServerSignerResolver` (`signers/server/resolver.ts`). `wallet.ts` now delegates derivation, locator resolution, recovery resolution, and key-material assembly to the resolver. Internal refactor — no behavior or public API changes.
