---
"@crossmint/client-sdk-react-base": patch
---

`getOrCreateWallet` no longer retries forever when `createOnLogin` fails. A failed attempt used to rewrite the error state, recreate the callback and refire the login effect, so status oscillated between `in-progress` and `error` for as long as the page was open. It now settles on `error` for the args that failed, and retries only when `createOnLogin` or the JWT changes.
