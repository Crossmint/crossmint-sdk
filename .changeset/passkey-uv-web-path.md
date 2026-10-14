---
"@crossmint/wallets-sdk": patch
---

Reject a passkey assertion that lacks the user-verification flag on the browser WebAuthn path too, not only when a custom `onSignWithPasskey` is supplied. `WebAuthnP256.sign` requests user verification but does not check that the authenticator honoured it; a UV-less assertion used to be forwarded and fail later as a bundler AA24 "Invalid signature".
