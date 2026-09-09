---
"@crossmint/client-sdk-window": patch
---

`EventEmitter.send` and `EventEmitter.on` now check own-key presence on their schema maps instead of indexing blind, so an event name inherited from `Object.prototype` (`constructor`, `toString`, `__proto__`, ...) no longer resolves to a non-schema value and blows up with `schema.safeParse is not a function`.

`send` throws a named error identifying the missing event rather than the opaque `TypeError`, keeping the existing fail-fast behaviour: an unmapped event must not be posted unvalidated, since the peer that would receive it is exactly the peer whose schema map is out of sync, and `WindowTransport` may be targeting `"*"`.

`on` resolves the schema once at registration and reports a missing one there via `console.error`, instead of warning on every inbound message. Its listener also no longer dereferences `message.data` unguarded, so a `null` payload from an unrelated `postMessage` on the page is ignored rather than throwing inside the handler.
