---
"@crossmint/common-sdk-base": patch
---

`isValidStellarAddress` no longer accepts a leading `|` or the digits 0, 1, 8 and 9, which can never appear in a Stellar StrKey address.
