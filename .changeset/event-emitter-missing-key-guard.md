---
"@crossmint/client-sdk-window": patch
---

`EventEmitter.send` and `EventEmitter.on` no longer throw a `TypeError` when an event is absent from their schema map. `send` warns and transmits the event unvalidated, since a missing key is a map-sync gap rather than bad caller data and dropping it would silently break consumers already listening for that event. `on` warns and skips the callback.
