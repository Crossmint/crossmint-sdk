---
"@crossmint/client-sdk-base": patch
"@crossmint/client-sdk-react-ui": patch
---

Add `verification-refused` to `CvcRecollectionError.reason`: the hosted CVC recollection form reports it (retriable) when Crossmint refuses to confirm the vault write instead of the generic `unknown`.
