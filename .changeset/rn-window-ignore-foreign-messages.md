---
"@crossmint/client-sdk-rn-window": patch
---

The WebView transport ignores `message` events sent by other windows, such as frames or popups on the page, and only accepts messages delivered by the host app or by the page itself.
