---
"@crossmint/expo-device-signer": minor
"@crossmint/client-sdk-react-native-ui": patch
---

feat: support Expo Go with software-backed device signer fallback

Added `SoftwareDeviceSignerKeyStorage` — a pure JavaScript implementation of `DeviceSignerKeyStorage` that uses `@noble/curves` for P-256 key operations and `expo-secure-store` for encrypted key persistence. This allows the SDK to run in Expo Go where the native `CrossmintDeviceSigner` module is not available.

Added `createDeviceSignerKeyStorage()` factory function that auto-detects whether the native module is available and returns the appropriate implementation (native hardware-backed in dev builds, software fallback in Expo Go).

Improved error message in `NativeDeviceSignerKeyStorage` when the native module is unavailable.
