---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": minor
"@crossmint/client-sdk-window": minor
---

Add individual protected buyer fields with typed field descriptors and per-field
`ref.collect()` results. The application supplies its buyer JWT and owns labels,
errors and submission; the existing CrossmintProvider supplies the client API key.

Replace the password-only `merchantUrl`/`onCreated` interface with `field` and
`jwt` props plus `collected`, `invalid`, `unavailable` and `superseded` outcomes.
Protected fields support single-line text, number and integer. Authentication
travels through the iframe channel rather than its URL; `disabled` and `invalid`
update through that channel. Add AbortSignal cancellation to window actions so
pending collection waits settle on authentication changes, reload or unmount.
