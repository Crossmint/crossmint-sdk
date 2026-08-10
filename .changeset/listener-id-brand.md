---
"@crossmint/client-sdk-window": major
"@crossmint/client-sdk-rn-window": major
"@crossmint/client-sdk-base": major
---

`EventEmitter.on()` now returns a branded `ListenerId` instead of a plain `string`, and `off()` only accepts one. Passing an event name to `off()` was a silent no-op that leaked the listener, and it type-checked because both are strings. It is now a compile error, so anyone holding an id in a `string`-typed variable has to switch to the exported `ListenerId`.

`Transport.addMessageListener()` / `removeMessageListener()` are branded the same way, so the ids are branded where they are minted and the publicly exported transports (`SignersWindowTransport`, `RNWebViewTransport`) no longer accept an event name either.

This is breaking for every package that re-exposes an emitter's `off()`: `@crossmint/client-sdk-base` (`PaymentMethodManagementIFrameEmitter`, `EmbeddedCheckoutV3IFrameEmitter`, `IdentityVerificationIFrameEmitter`) and `@crossmint/client-sdk-rn-window` (`WebViewParent`).
