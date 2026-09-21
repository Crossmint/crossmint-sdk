---
"@crossmint/common-sdk-base": patch
"@crossmint/wallets-sdk": patch
"@crossmint/client-sdk-base": patch
---

Remove the deprecated chains from the SDK.

These chains are no longer supported. The SDK no longer accepts them:

- Mode (`mode`, `mode-sepolia`)
- Plume (`plume`, `plume-testnet`)
- World Chain (`world-chain`, `world-chain-sepolia`)
- Astar zkEVM (`astar-zkevm`)
- zKatana (`zkatana`) and zKyoto (`zkyoto`)
- The Goerli testnets (`ethereum-goerli`, `base-goerli`, `optimism-goerli`, `zora-goerli`)
- Polygon Mumbai (`polygon-mumbai`)

The chain names are removed from `EVMBlockchain`, `EVMBlockchainTestnet` and from the
`BLOCKCHAIN_TO_COPY_NAME` and `BLOCKCHAIN_TO_CHAIN_ID` maps in `@crossmint/common-sdk-base`.
`@crossmint/wallets-sdk` no longer lists them as smart-wallet chains, so `Chain`,
`EVMSmartWalletChain` and `validateChainForEnvironment` reject them.

Migration: use a supported chain. Code that passes one of these names no longer compiles.
Code that passes one of these names at run time now gets an `InvalidChainError`.
