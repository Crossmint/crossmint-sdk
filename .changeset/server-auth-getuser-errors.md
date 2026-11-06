---
"@crossmint/server-sdk": patch
"@crossmint/common-sdk-auth": patch
---

`CrossmintAuth.getUser` now throws a `CrossmintAuthenticationError` when Crossmint rejects the request, instead of returning the API's error body as if it were the user. The error carries the HTTP `status` and the API's message, which names the missing `users.read` scope when the API key lacks it. `getUser` now returns `SDKExternalUser` instead of `any`, and the server SDK exports `CrossmintAuthenticationError` and `SDKExternalUser`. Failed session refreshes and logouts also report the status and the API's message.
