---
"@crossmint/client-sdk-react-native-ui": patch
---

The React Native embedded offramp now accepts wallet requests (`crypto:send-transaction`, `crypto:sign-message`) only from the offramp page's main frame, not from frames embedded in it.
