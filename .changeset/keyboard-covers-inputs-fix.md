---
"@crossmint/client-sdk-react-native-ui": patch
---

fix: enable WebView scrolling for keyboard visibility in embedded checkout (PAY-11522)

- Changed `scrollEnabled` from `false` to `true` on the embedded checkout WebView to allow scrolling when the keyboard opens
- Removed `overflow: "hidden"` from the WebView inline style
- Added `keyboardDismissMode="on-drag"` to dismiss keyboard when user scrolls
