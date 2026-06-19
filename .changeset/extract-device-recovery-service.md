---
"@crossmint/wallets-sdk": patch
---

refactor: extract DeviceRecoveryService from wallet.ts

- `wallets/services/device-recovery-service.ts`: a `DeviceRecoveryService` owning device-signer initialization and recovery (`initDeviceSigner`, `recover`, `resolveAvailability`, pending-approval resumption, local-key matching, unsupported-provider fallback)
- the three device flags (`#needsRecovery` / `#deviceSignerApproved` / `#deviceSignerUnsupported`) are replaced by an explicit `DeviceSignerState` lifecycle (`"unknown" | "needs-recovery" | "resolved"`) plus an orthogonal provider-rejection latch
- `wallet.ts` delegates `recover()` / `needsRecovery()` and the device branch of `useSigner`; the signer-session → device-recovery coupling collapses to one `onSignerSelected()` notification

Internal refactor — no behavior or public API changes.
