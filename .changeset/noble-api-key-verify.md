---
"@crossmint/common-sdk-base": patch
---

Verify API key signatures with `@noble/ed25519` instead of `tweetnacl`. This cuts about 20 KB (minified) from every app that validates an API key, such as the protected input and payment method management components. `@noble/ed25519` is inlined into the build so the CommonJS output still works on older Node versions.
