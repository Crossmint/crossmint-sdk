---
"@crossmint/client-sdk-react-ui": major
"@crossmint/client-sdk-react-base": major
---

Remove Dynamic crypto wallet authentication from Crossmint Auth.

This is a breaking change that removes the ability to authenticate with crypto wallets via Dynamic (dynamic-xyz) in the React UI SDK. The following are removed:

- `web3`, `web3:evm-only`, and `web3:solana-only` login methods
- `experimental_externalWalletSigner` from the auth context
- All `@dynamic-labs/*` dependencies
- `CryptoWalletConnectionHandler` for embedded checkout crypto wallet flows
