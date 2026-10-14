---
"@crossmint/server-sdk": patch
---

Security fix: `CrossmintAuth.getSession`, `handleCustomRefresh` and `verifyCrossmintJwt` now reject Crossmint session JWTs that were issued for a different project.

Before this fix, any valid Crossmint session JWT was accepted no matter which project it was issued for, so a token from another Crossmint-auth app could authenticate its user in yours. The SDK now requires the JWT `aud` claim to match the project ID of your API key, on both the JWT and the token-refresh paths. Sessions from another project fail with `CrossmintAuthenticationError` and their auth cookies are cleared.

Upgrade to this version if you use `@crossmint/server-sdk` to authenticate users.
