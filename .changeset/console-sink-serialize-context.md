---
"@crossmint/common-sdk-base": patch
---

ConsoleSink now emits a single self-contained string with the serialized context instead of passing the context object as a second console argument, so text-based console consumers (Playwright, Sentry breadcrumbs, log shippers) no longer see `JSHandle@object`.
