---
"@crossmint/client-sdk-react-native-ui": patch
---

Fix device signers failing with `keyNotFound` after restoring a wallet onto a new phone. `hasKey` now checks the live keychain instead of a backup-eligible record, so a key that did not transfer to the new device is detected as missing and the device re-registers a fresh signer.
