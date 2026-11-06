---
"@crossmint/client-sdk-react-native-ui": patch
---

The React Native embedded offramp now ignores wallet requests (`crypto:send-transaction`, `crypto:sign-message`) sent from cross-origin frames embedded in the offramp page; same-origin frames can still reach the main frame.
