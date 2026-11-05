---
"@crossmint/server-sdk": patch
"@crossmint/common-sdk-auth": patch
---

`CrossmintAuth.getUser` now throws a `CrossmintAuthenticationError` when Crossmint rejects the request, instead of returning the API's error body as if it were the user. The error carries the HTTP `status` and the API's message, and on a 401 or 403 it says that `getUser` needs a server API key with the `users.read` scope. `getUser` now returns `SDKExternalUser` instead of `any`, and the server SDK exports `CrossmintAuthenticationError` and `SDKExternalUser`. Failed session refreshes and logouts also report the status and the API's message.
