---
"@crossmint/client-sdk-react-native-ui": patch
---

Fix iOS WKWebView JS throttling caused by zero-area clipping. Replace `overflow: hidden` + `width: 0, height: 0` wrapper with `opacity: 0` + `pointerEvents: none` so the WebView backing layer stays composited and iOS does not deprioritize the WebContent process.
