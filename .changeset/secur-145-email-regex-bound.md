---
"@crossmint/common-sdk-auth": patch
---

Reject emails longer than 254 characters in `isEmailValid` before running the validation regex, bounding backtracking work on untrusted input.
