---
"@crossmint/wallets-sdk": major
"@crossmint/client-sdk-react-base": patch
"@crossmint/client-sdk-react-ui": patch
"@crossmint/client-sdk-react-native-ui": patch
---

Split getOrCreateWallet into separate getWallet and createWallet methods, both working client and server side. Make signer optional for read-only wallets. Add device signer resolution logic in getWallet. Add createDeviceSigner helper function. Support device signers with pre-existing locators.
