---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": minor
---

`CrossmintAgentCardAuthorization` and `OrderIntentVerification` take an optional `openRedirect(uri)` prop. When it is set, the Mastercard verification page opens through the host instead of `window.open`. Use it when the component runs in a mobile WebView: open `uri` in `ASWebAuthenticationSession` (iOS) or Chrome Custom Tabs (Android), so Mastercard recognizes the device and verifies the existing passkey instead of asking for a new one. Do not close that browser from `onAuthorized` or `onVerificationComplete`: they can fire while Mastercard still offers to save a passkey. `openRedirect` can return a promise that resolves when the browser closes, including a dismissal (for example `openAuthSessionAsync` in `expo-web-browser`, not `openBrowserAsync`, which resolves when the tab opens on Android), and rejects only when the browser cannot open; if the order intent is not verified 10 seconds later, the component reports the error at once instead of after 5 minutes, and the buyer can try again. `@basis-theory/web-agentic` is now 1.4.1.
