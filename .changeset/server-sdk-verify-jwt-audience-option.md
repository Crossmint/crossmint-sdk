---
"@crossmint/server-sdk": patch
---

`verifyCrossmintJwt` now requires an `audience` option.

Pass your project ID when you call the standalone function: `verifyCrossmintJwt(token, jwks, { audience: projectId })`. The function throws if `audience` is missing. It also requires the `exp`, `sub` and `aud` claims and accepts only RS256 signatures. `CrossmintAuth#verifyCrossmintJwt` and `getSession` already pass the project ID, so no change is needed there.
