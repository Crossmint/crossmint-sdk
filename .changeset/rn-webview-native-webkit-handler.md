---
"@crossmint/client-sdk-rn-window": patch
---

Detect React Native WebView hosts via the native `webkit.messageHandlers.ReactNativeWebView` handler and post outgoing events through it when the injected `window.ReactNativeWebView` shim is absent (react-native-webview with `enableApplePay`). Exports `isRNWebViewHost` / `getRNWebViewPostMessage`.
