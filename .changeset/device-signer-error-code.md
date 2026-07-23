---
"@crossmint/client-sdk-react-native-ui": minor
---

Surface the device signer error code and underlying reason from the native module, so a failed sign is diagnosable from its logs instead of a generic `SignMessageFailed`.

`DeviceSignerModule.signMessage` now throws the Expo exception with the SDK error code passed explicitly through `code:` (Expo otherwise derives the code from the exception name, which garbles an `UPPER_SNAKE` value like `DEVICE_SIGNER_SIGNING_FAILED`), and with the underlying error in the message. Also bumps the `CrossmintDeviceSigner` pod to `~> 1.1.2`, which carries that underlying detail.
