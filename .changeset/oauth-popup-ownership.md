---
"@crossmint/client-sdk-react-ui": patch
---

Fixes the OAuth popup flow losing logins when a second provider is clicked.

`useOAuthWindowListener` passed event names to `off()`, which never matched a listener id and so removed nothing. Every provider click stacked another listener pair on the same `ChildWindow`, and one popup callback then redeemed the same one-time secret once per pair; the second redemption fails server-side, so the user saw a login error after appearing to succeed.

All providers share one named popup (`PopupWindow.initEmpty` opens `window.open(..., "popupWindow")`), and the flow resumes at three points after handing that popup over: the URL await, the auth-material refresh await, and the 2.5s closure poller. Each flow now claims the popup and re-checks the claim at every one of them, so a superseded flow can no longer close the popup, publish its error, or clear the loading state belonging to the flow that replaced it.

Two teardown-ordering fixes fall out of `off()` finally working:

- Listener teardown happens when a new flow takes the popup over, not at the top of the call. Doing it earlier left a still-live popup with nothing listening across the URL await, dropping a login that had already completed.
- The closure poller no longer removes listeners. The callback page posts its one-time secret and then closes itself, so a tick landing in that gap dropped the material. Takeover and unmount both remove them, so at most one pair is ever alive.

Unmounting mid-flow now closes the popup it opened, instead of leaving a window on screen that nothing will ever close.
