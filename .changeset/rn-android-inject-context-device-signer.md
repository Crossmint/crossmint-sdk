---
"@crossmint/client-sdk-react-native-ui": patch
---

Fix Android device signer key lookup failures on low-end devices by injecting the React context directly into `KeystoreKeyStorage` instead of relying on a `ContentProvider` to set it via a static singleton.

The `DeviceSignerModule` now passes `appContext.reactContext` to `DeviceSignerStorageFactory.create(context)`, bypassing the `DeviceSignerContextHolder` initialization race that caused `SharedPreferences` to be permanently unavailable on some devices.

Requires `com.crossmint:sdk-device-signer` >= 0.0.16 (with the `create(context)` factory overload).
