---
"@crossmint/common-sdk-base": minor
"@crossmint/wallets-sdk": patch
---

Stop installing viem and @solana/web3.js with `@crossmint/common-sdk-base`. viem was unused, and @solana/web3.js was only needed for the `VersionedTransaction` type in the external wallet signer configs. This removes the vulnerable Solana dependency tree (stream-json, uuid) from packages that only need the shared base, such as the server and auth SDKs.

The external wallet signer config types (`ExternalWalletSignerConfig`, `SolanaExternalWalletSignerConfig`, `EvmExternalWalletSignerConfig`, `StellarExternalWalletSignerConfig`) now live in `@crossmint/wallets-sdk`, which already exported them. Import them from `@crossmint/wallets-sdk` instead of `@crossmint/common-sdk-base`.
