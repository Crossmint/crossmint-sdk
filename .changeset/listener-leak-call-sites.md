---
"@crossmint/client-sdk-react-native-ui": patch
"@crossmint/client-sdk-react-ui": patch
---

Fixes the listener leak at the remaining call sites that passed an event name to `off()` and so never removed anything: `CrossmintPaymentMethodManagementIFrame`, `EmbeddedCheckoutV3IFrame` and `EmbeddedCheckoutV3WebView`. All three set their emitter once, so the cleanup only runs on unmount and the listeners simply outlived the component.

`CrossmintPaymentMethodManagementIFrame` also read its callbacks from the render that mounted it, so a callback replaced after mount never fired, and it called `off("agentic-enrollment:created")` for an event it never subscribed to.
