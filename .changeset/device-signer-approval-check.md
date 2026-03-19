---
"@crossmint/wallets-sdk": patch
---

fix: check device signer approval instead of needsRecovery flag in recover()

Replaces the needsRecovery() flag check with an actual signerIsRegistered() call to verify
whether the device signer is approved on the wallet. This fixes the case where the recovery
signer does not require auth and there is no device signer, causing recover() to skip
registration.
