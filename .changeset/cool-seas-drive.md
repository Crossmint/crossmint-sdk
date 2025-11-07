---
"@crossmint/client-sdk-react-native-ui": patch
"@crossmint/client-sdk-rn-window": patch
"@crossmint/client-signers": patch
---

Add IndexedDB fatal error recovery with automatic WebView reload and retry. Implements typed error codes (SignerErrorCode.IndexedDbFatal) and opt-in recovery options in WebViewParent for handling fatal IndexedDB errors.
