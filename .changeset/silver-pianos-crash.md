---
"@crossmint/client-sdk-react-base": patch
"@crossmint/client-sdk-auth": patch
---

Fix JWT cookie scoping to prevent audience mismatch warnings when switching between projects. Cookies are now scoped by API key prefix (e.g., crossmint-jwt-ck_staging) with backward compatibility for legacy cookies. Also adds API key change detection to clear JWT state when the API key changes.
