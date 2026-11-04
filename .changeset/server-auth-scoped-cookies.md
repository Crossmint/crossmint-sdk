---
"@crossmint/server-sdk": patch
"@crossmint/common-sdk-auth": patch
"@crossmint/client-sdk-auth": patch
---

Read and write the project-scoped auth cookies in the server SDK. Since `@crossmint/client-sdk-auth` 1.3.4 the client stores the session as `crossmint-jwt-<projectId>` and `crossmint-refresh-token-<projectId>`, but the server SDK only read and wrote `crossmint-jwt` and `crossmint-refresh-token`, so `getSession(request)` saw no session and a custom refresh route stored cookies the client never read. `getSession(request)`, `handleCustomRefresh` and `logout` now read the scoped names first and fall back to the legacy names. `storeAuthMaterial` (and so `getSession(request, response)`, `handleCustomRefresh` and `logout`) writes the scoped names and expires the legacy ones. New `getAuthCookieNames()` returns the scoped names, for code with no request object such as a Next.js Server Component. The naming helper `getScopedCookieName` now lives in `@crossmint/common-sdk-auth` and the client uses it.
