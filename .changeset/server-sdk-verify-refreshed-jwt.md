---
"@crossmint/server-sdk": patch
"@crossmint/common-sdk-auth": patch
---

`CrossmintAuth.getSession` and `handleCustomRefresh` now verify refreshed session JWTs against Crossmint's JWKS and take the user ID from the verified JWT `sub` claim. `refreshRoute` should be a static absolute URL.
