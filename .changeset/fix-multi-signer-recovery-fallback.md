---
"@crossmint/wallets-sdk": patch
---

fix: fall back to recovery signer when wallet has multiple delegated signers

Previously, when a wallet had more than one delegated signer, `initDefaultSigner` would leave the signer undefined, requiring an explicit `useSigner()` call. This caused errors like "No signer is set. This wallet has multiple signers configured" in applications that use the wallet directly (e.g. lobster.cash agent setup flow with >1 agents).

Now the wallet falls back to the recovery signer in the multi-signer case, keeping the wallet usable by default. Users who need a specific delegated signer can still call `useSigner()` to override.

