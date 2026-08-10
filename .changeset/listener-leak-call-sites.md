---
"@crossmint/client-sdk-react-native-ui": patch
"@crossmint/client-sdk-react-ui": patch
---

Fixes the listener leak at the remaining call sites that passed an event name to `off()` and so never removed anything: `CrossmintPaymentMethodManagementIFrame`, `EmbeddedCheckoutV3IFrame` and `EmbeddedCheckoutV3WebView`. All three set their emitter once, so the cleanup only runs on unmount and the listeners simply outlived the component.

`CrossmintPaymentMethodManagementIFrame` also read its callbacks from the render that mounted it, so a callback replaced after mount never fired, and it called `off("agentic-enrollment:created")` for an event it never subscribed to.

`CrossmintIdentityVerificationIFrame` was not leaking, but it shares that latest-callback pattern, which now lives in one place and assigns during render rather than in a passive effect. Both components therefore close a narrow window where an event delivered between commit and the effect flush invoked the previous render's callback.
