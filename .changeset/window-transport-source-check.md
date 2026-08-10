---
"@crossmint/client-sdk-window": patch
"@crossmint/client-sdk-react-ui": patch
---

`WindowTransport` now matches `event.source` against the peer window instead of trusting the origin alone.

Each client subscribes to the global `message` event and accepted anything arriving from a matching origin. With one Crossmint iframe per page, no other frame could send from that origin, so the gap stayed invisible. Put two on a page and each client receives the other's events.

Embedded checkout with `identityVerificationHandling="external"` puts two on the page. The verification iframe sends `ui:height.changed` at 660, the checkout iframe takes that height after collapsing to 0, and the merchant gets 660px of empty space above their widget. Reverse the order and checkout's 0 reaches the verification iframe and hides the Persona form.

A message whose sending window has closed carries a null source. The transport drops it.

OAuth login moves its listeners onto the popup it opens. They used to sit on a `ChildWindow` built over `window.opener || window.parent`, which on a merchant's top-level page resolves to that page's own window, so the peer never matched the popup the callback arrives from. That client only ever listened, never sent, so the mismatch was invisible until the peer became part of the receive path. Attaching to the popup also unsubscribes correctly between attempts, where the previous `off(eventName)` calls passed an event name to an API that takes a listener id and silently did nothing.
