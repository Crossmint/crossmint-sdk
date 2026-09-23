---
"@crossmint/wallets-sdk": patch
"@crossmint/client-signers": patch
---

Tell the signer frame which recovery method a request is for.

The signer frame stores one key per device and user. After onboarding a phone recovery method, selecting an
email recovery method on the same device made the frame report `ready`, skip the OTP, and sign with the
phone-derived key, which the API rejected with `Invalid signature for signer email:...`.

`@crossmint/wallets-sdk` now sends the selected recovery method's `authId` on `get-status` and `sign`, so a
frame that tracks the recovery method per device can request onboarding for the selected one instead of
signing with another method's key.

`@crossmint/client-signers` adds the optional `authId` to the `get-status` and `sign` request payloads.
