---
"@crossmint/common-sdk-base": patch
"@crossmint/wallets-sdk": patch
---

Remove the Abstract chain (`abstract`, `abstract-testnet`) from the SDK.

The Abstract network shuts down on December 15, 2026, and Crossmint no longer supports it.

The chain names are removed from `EVMBlockchain`, `EVMBlockchainTestnet` and from the
`BLOCKCHAIN_TO_COPY_NAME` and `BLOCKCHAIN_TO_CHAIN_ID` maps in `@crossmint/common-sdk-base`.
`@crossmint/wallets-sdk` no longer lists them as smart-wallet chains, so `Chain`,
`EVMSmartWalletChain` and `validateChainForEnvironment` reject them.

Migration: use a supported chain, and move assets off Abstract before December 15, 2026.
Code that passes one of these names no longer compiles. At runtime, wallet-chain validation
throws an `InvalidChainError`, and common display-name and chain-ID lookups return `undefined`.
