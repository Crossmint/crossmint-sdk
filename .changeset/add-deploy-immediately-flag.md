---
"@crossmint/wallets-sdk": minor
---

feat(wallets): add `deployImmediately` flag to EVM `addSigner`

When registering a delegated signer on an EVM wallet, the SDK now sends
`deployImmediately: true` by default, causing the API to return an on-chain
registration transaction instead of the lazy signature-request flow. This can be
overridden by passing `{ deployImmediately: false }` in the options.
