---
"@crossmint/client-sdk-react-base": patch
"@crossmint/client-sdk-react-native-ui": patch
---

React Native: `createOnLogin` and `createWallet` start the signer WebView when a delegated email or phone signer (or an email or phone member of a delegated quorum) needs it, not only for recovery methods.
