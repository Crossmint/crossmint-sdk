---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": minor
---

`CrossmintAgentCardAuthorization` and `OrderIntentVerification` take an optional `openRedirect(uri)` prop. When it is set, the Mastercard verification page opens through the host instead of `window.open`. Use it when the component runs in a mobile WebView: open `uri` in `ASWebAuthenticationSession` (iOS) or Chrome Custom Tabs (Android), so Mastercard recognizes the device and verifies the existing passkey instead of asking for a new one. Do not close that browser from `onAuthorized` or `onVerificationComplete`: they can fire while Mastercard still offers to save a passkey. `@basis-theory/web-agentic` is now 1.4.1.
