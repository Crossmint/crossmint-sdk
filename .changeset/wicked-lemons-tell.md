---
"@crossmint/client-sdk-auth": patch
---

Fix JWT cookie scoping to prevent cross-project token usage. JWTs are now scoped by project ID and only refresh tokens fall back to legacy cookies for migration.
