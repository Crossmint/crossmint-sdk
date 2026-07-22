---
"@crossmint/client-sdk-react-native-ui": patch
---

Fix signer OTP dialog hiding the Submit/Re-send buttons behind the on-screen keyboard on mobile. The email and phone signer dialogs now wrap their content in a `KeyboardAvoidingView`, and the shared code-entry view is scrollable, so the OTP input and actions stay reachable when the keyboard is open.
