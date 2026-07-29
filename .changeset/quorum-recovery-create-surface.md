---
"@crossmint/wallets-sdk": minor
"@crossmint/client-sdk-react-base": patch
---

Widen `WalletCreateArgs.recovery` to also accept a quorum config (`{ type: "quorum", threshold?, methods }`) whose members exclude `api-key` and `device` signers. `createWallet` preps each quorum member (passkey credential creation, server-signer address derivation) and forwards the quorum on the `recovery` wire property; a single-method quorum collapses to a plain admin signer and empty `methods` are rejected. Validation against an existing wallet compares the threshold and member set order-insensitively. Single-signer payloads are unchanged.
