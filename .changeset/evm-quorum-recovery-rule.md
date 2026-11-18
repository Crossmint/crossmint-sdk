---
"@crossmint/wallets-sdk": patch
---

`createWallet` reports an API rejection without an error code as `WalletCreationError` with the API's message (for example "A wallet created with a recovery quorum also needs a single recovery signer.") instead of the raw JSON body. The class and `code` (`wallet:wallet-creation-failed`) are unchanged, and the full response is in `details`. The `recoveryMethods` docs now say that on EVM a recovery quorum needs at least one single recovery method next to it; Stellar accepts quorums alone.
