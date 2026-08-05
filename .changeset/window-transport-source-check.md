---
"@crossmint/client-sdk-window": patch
---

`WindowTransport` now matches `event.source` against the peer window instead of trusting the origin alone.

Each client subscribes to the global `message` event and accepted anything arriving from a matching origin. With one Crossmint iframe per page, no other frame could send from that origin, so the gap stayed invisible. Put two on a page and each client receives the other's events.

Embedded checkout with `identityVerificationHandling="external"` puts two on the page. The verification iframe sends `ui:height.changed` at 660, the checkout iframe takes that height after collapsing to 0, and the merchant gets 660px of empty space above their widget. Reverse the order and checkout's 0 reaches the verification iframe and hides the Persona form.

A message whose sending window has closed carries a null source. The transport drops it.
