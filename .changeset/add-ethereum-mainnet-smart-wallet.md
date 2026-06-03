---
"@crossmint/wallets-sdk": minor
---

feat: add Ethereum mainnet to smart wallet supported chains

Add `Blockchain.ETHEREUM` to `PRODUCTION_AA_CHAINS`, the `toViemChain` switch, and `MAINNET_TO_TESTNET_MAP` so the SDK no longer rejects Ethereum mainnet with an `InvalidChainError` before the API call is made.
