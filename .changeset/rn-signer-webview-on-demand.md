---
"@crossmint/client-sdk-react-base": patch
"@crossmint/client-sdk-react-native-ui": patch
---

React Native: `createOnLogin` and `createWallet` load or create a wallet whose keys are not email or phone signers (a quorum, an external wallet, a passkey or a server key) instead of failing with `WebView not ready or handshake incomplete`. The signer WebView starts only when an email or phone key needs it, including an email or phone member of a quorum and a delegated email or phone signer.
