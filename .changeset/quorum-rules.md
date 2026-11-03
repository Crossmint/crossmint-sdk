---
"@crossmint/wallets-sdk": minor
---

Export the quorum error classes `QuorumRequestError` (the API's quorum error code in `reason`), `QuorumSelectionAmbiguousError` and `TransactionExpiredError`, and the `QuorumMemberLocator` type. The SDK does not throw them yet.

Signer locators now match the way the API matches them: the EVM address in an `external-wallet:0x…` or `server:0x…` locator compares by checksum, so a checksummed and a lowercase address name the same signer. This applies when `approve` picks the signing key and when a signer change picks the authorizing recovery method, which before threw `InvalidSignerError` or `RecoveryMethodRequiredError` on a case-only difference.
