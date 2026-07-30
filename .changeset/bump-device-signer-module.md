---
"@crossmint/client-sdk-react-native-ui": patch
---

Bumped the pinned `CrossmintDeviceSigner` native module to 1.1.3, which fixes `getKey`/`hasKey` to correctly report a Secure Enclave key as unusable when it's present but broken, and fixes a stale signer locator being submitted on device signer approvals.
