---
"@crossmint/client-sdk-react-native-ui": patch
---

The signer OTP field now submits from the keyboard's done key.

`BaseCodeInput` only accepted the code via the Submit button, which sits below the field and therefore behind the keyboard the field just opened. Entering a code meant dismissing the keyboard first — and dismissing it reflows the dialog, moving the button that was the only way to continue.

`returnKeyType="done"` with `onSubmitEditing` submits in place, from where the user already is. The Submit button is unchanged.
