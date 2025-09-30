---
"@crossmint/client-sdk-react-native-ui": patch
---

Optimize WebView loading to only initialize when email or phone signer is used, avoiding unnecessary background polling for passkey and external wallet signers
