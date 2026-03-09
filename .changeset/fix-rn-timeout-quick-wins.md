---
"@crossmint/client-sdk-window": patch
"@crossmint/client-sdk-react-native-ui": patch
---

Category: bug fix
Product Area: wallets

Fix RN timeout error handling: reject with Error objects (not strings) for proper stack traces, and reset WebView connection state on OS process termination to prevent silent message loss.
