---
"@crossmint/wallets-sdk": minor
---

`createServerSigner` now returns a `sign(message)` function. It signs a message the API asks the server signer to approve (a transaction or signature approval, or a quorum member's approval message) exactly as the SDK's own server signer does on that chain: raw EIP-191 over 0x-hex on EVM, ed25519 over base58 on Solana, ed25519 over base64 on Stellar. Callers no longer need to rebuild per-chain signing from `keyBytes`.
