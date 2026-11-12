---
"@crossmint/wallets-sdk": minor
"@crossmint/client-sdk-react-base": minor
"@crossmint/client-sdk-react-ui": minor
---

Let apps turn on the device signer biometric policy on web. `IframeDeviceSignerKeyStorage` takes a second argument, `{ biometricPolicy, biometricExpirationTime }`, and every device key it creates (at wallet creation and at device recovery) gets that policy. `CrossmintWalletProvider` in `@crossmint/client-sdk-react-ui` takes the same options in a new `deviceSigner` prop, for example `deviceSigner={{ biometricPolicy: "always" }}`. Before each fingerprint, face or screen lock check, the React provider shows the passkey prompt so that the browser gets a user click. The policy is fixed when a key is created; existing keys keep their policy. `BiometricPolicy` and `DeviceSignerBiometricOptions` are now exported.
