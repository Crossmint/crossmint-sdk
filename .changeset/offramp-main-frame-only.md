---
"@crossmint/client-sdk-react-native-ui": patch
---

The React Native embedded offramp now loads the page with a per-mount random nonce in the URL fragment (`#mainFrameNonce=<hex>`). Once the page sends an event carrying that nonce, the host drops every event that lacks it, so cross-origin frames embedded in the offramp page can no longer send wallet requests (`crypto:send-transaction`, `crypto:sign-message`) or completion events. Pages that do not stamp their events yet keep working, with one warning per mount. A pending wallet request is no longer dropped when the page updates its URL on Android.
