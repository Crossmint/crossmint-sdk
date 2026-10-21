---
"@crossmint/client-sdk-rn-window": patch
"@crossmint/client-sdk-react-native-ui": patch
---

WebView refs type-check with react-native-webview 14, the version Expo SDK 58 ships. react-native-webview 14.0.1 declares `WebView<P = undefined>`, which makes the bare `WebView` type reject every prop. `@crossmint/client-sdk-rn-window` now exports `WebViewInstance` (`WebView<object>`) and uses it for `RNWebView` and `WebViewParent` refs. It also works with react-native-webview 13.
