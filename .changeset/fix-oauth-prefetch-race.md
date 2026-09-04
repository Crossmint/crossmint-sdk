---
"@crossmint/client-sdk-react-ui": patch
---

Fix OAuth URL prefetch race condition when auth dialog opens before initialization completes.

- Gate prefetch on `jwt == null` instead of `getAuthStatus() === "logged-out"` so the prefetch still runs when the dialog is open during initialization.
- Skip prefetch when `crossmintAuth` is not yet available to avoid fetching with a null client.
- Initialize `isLoadingOauthUrlMap` to `false` so consumers are not stuck in a loading state when the prefetch has not started.
- Strengthen URL validation to reject empty strings in addition to null/undefined.
