---
"@crossmint/client-sdk-window": patch
---

`EventEmitter` no longer logs `console.error` for a timeout it hands back to the caller as a rejection.

`sendAction` and `onAction` reject on timeout, and `sendAction` also rejects once it exhausts `maxRetries`. Each of those rejections was preceded by a `console.error`, so a caller that catches the rejection and recovers still left an error behind. Only the caller knows whether a timeout is fatal — `CrossmintWalletProvider` retries the WebView handshake twice and logs `handshake.error` itself if those run out.

On React Native the duplicate is not just noise. `console.error` raises a LogBox notification, which renders on top of the app: a handshake that timed out at 30s and succeeded on retry 16s later left a toast covering the bottom of the screen, over the app's own controls.
