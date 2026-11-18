---
"@crossmint/wallets-sdk": patch
---

Fixed removed EVM delegated quorums still listed by `signers()` and selectable via `useSigner`: a `quorum:` signer now counts as on-chain only when its `chains` map lists the chain (WAL-13715).
