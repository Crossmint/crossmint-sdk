---
"@crossmint/client-sdk-react-ui": patch
---

Fixes the OAuth popup flow losing logins when a second provider is clicked.

All providers share one named popup (`PopupWindow.initEmpty` opens `window.open(..., "popupWindow")`), so a second click wraps the window a first flow is still using in a client of its own. The flow resumes at three points after handing that popup over: the URL await, the auth-material refresh await, and the 2.5s closure poller. Each flow now claims the popup and re-checks the claim at every one of them, so a superseded flow can no longer close the popup, publish its error, or clear the loading state belonging to the flow that replaced it.

Two teardown-ordering fixes come with it:

- Listener teardown happens when a new flow takes the popup over, not at the top of the call. Doing it earlier left a still-live popup with nothing listening across the URL await, dropping a login that had already completed.
- The closure poller no longer removes listeners. The callback page posts its one-time secret and then closes itself, so a tick landing in that gap dropped the material. Takeover and unmount both remove them, so at most one pair is ever alive.

Unmounting mid-flow now closes the popup it opened, instead of leaving a window on screen that nothing will ever close.
