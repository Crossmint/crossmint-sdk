---
"@crossmint/client-signers": minor
"@crossmint/wallets-sdk": patch
---

Correlate `request:sign` with its `response:sign` through an optional `requestId`. The signer frame echoes the id when the request carries one; once a frame has shown it does, the email/phone signers send concurrent sign requests in parallel instead of queueing them. Frames that do not echo the id keep the queued behaviour.
