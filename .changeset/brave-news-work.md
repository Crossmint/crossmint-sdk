---
"@crossmint/client-sdk-react-native-ui": patch
"@crossmint/wallets-sdk": patch
---

Summary

- Cache OTP auth state in ensureAuthenticated() to avoid calling get-status on the TEE every transaction
- Fixes repeated OTP prompts in React Native when the WebView process is terminated by iOS and reloaded without prior session state
