---
"@crossmint/wallets-sdk": patch
"@crossmint/client-signers": patch
---

Stop email/phone recovery methods from signing with another recovery method's keys.

The signer frame stores one key per device and user. After onboarding a phone recovery method, selecting an
email recovery method on the same device made the frame report `ready`, skip the OTP, and sign with the
phone-derived key, which the API rejected with `Invalid signature for signer email:...`.

`@crossmint/wallets-sdk` now compares the public key the frame reports on `get-status`, `start-onboarding`
and `sign` with the selected recovery method's registered address. A mismatch triggers `onAuthRequired`
so the recovery method is onboarded again, and a signature produced with the wrong key throws
`SignerKeyMismatchError` instead of being submitted.

`@crossmint/client-signers` adds an optional `authId` to the `get-status` and `sign` request payloads so the
frame can answer for the selected recovery method.
