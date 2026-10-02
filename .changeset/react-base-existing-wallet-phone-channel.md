---
"@crossmint/client-sdk-react-base": patch
---

An existing wallet keeps the phone signer's OTP `channel` from `createOnLogin`. The API never returns `channel`, so after a reload a WhatsApp phone signer sent its OTP by SMS. `getOrCreateWallet` now passes the recovery and signer config to `getWallet`, which merges it in. If that config no longer matches the existing wallet, the wallet loads without it, as before.
