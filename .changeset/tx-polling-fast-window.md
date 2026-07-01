---
"@crossmint/wallets-sdk": patch
---

Two-phase transaction status polling: fixed 500ms cadence during the first 5 seconds (when most transactions confirm), then exponential backoff (1.5x, capped at 2s). The poll request's own duration now counts toward the cadence, and sleeps are clamped to the confirmation timeout.
