---
"@crossmint/client-sdk-auth": patch
---

Fix legacy cookie fallback causing cross-project token usage. Legacy unscoped cookies are now migrated to scoped cookies on first use and then deleted, preventing a different project on the same domain from picking them up.
