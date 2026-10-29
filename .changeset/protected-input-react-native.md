---
"@crossmint/client-sdk-react-native-ui": minor
---

Add `CrossmintProtectedInput` to the React Native SDK: the hosted protected-input page in a WebView, taking the buyer's `jwt` like `CrossmintPaymentMethodManagement` and returning an opaque `protectedInputId` for Universal Checkout through `onCreated`. A WebView that cannot load the page reports `onError({ code: "load_failed" })`.
