---
"@crossmint/client-sdk-react-native-ui": patch
"@crossmint/common-sdk-base": patch
---

Fix handshake timeout race condition on low-end Android devices by triggering handshake on frame-ready signal instead of onLoadEnd. Add dead WebView recovery with handshake state reset. Throw structured ApiClientError on 5xx responses instead of crashing on HTML error pages.
