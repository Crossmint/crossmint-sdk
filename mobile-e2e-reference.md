# Mobile E2E Test Suite — Reference

## Overview

Nightly E2E regression suite that tests all 6 SDK × platform combinations against staging.
Repo: `Crossmint/crossmint-mobile-e2e-tests` (local clone: `/private/tmp/crossmint-mobile-e2e-tests`)
Orchestrated by: `Crossmint/crossmint-sdk` `.github/workflows/nightly.yml` (dispatch also via `on-dispatch.yml`)

---

## Current Status — ✅ 6/6 green (last run: 2026-06-08, run ID 27139193929)

| Platform | Workflow file | App ID | Maestro duration |
|---|---|---|---|
| React Native iOS | `e2e-rn-ios.yml` | `com.crossmint.walletsplayground` | ~3m 32s |
| React Native Android | `e2e-rn-android.yml` | — | ~3m 48s |
| Swift iOS | `e2e-swift-ios.yml` | `com.paella.SmartWalletsDemo` | ~3m 17s |
| Kotlin Android | `e2e-kotlin-android.yml` | — | ~3m 24s |
| Flutter iOS | `e2e-flutter-ios.yml` | `com.example.crossmintwallet` | ~4m 56s |
| Flutter Android | `e2e-flutter-android.yml` | — | ~3m 12s |

---

## Architecture

- One workflow file per SDK × platform (no `if: inputs.sdk ==` guards)
- All 6 workflows are `workflow_call` with inputs `sdk_repo` + `sdk_ref` and `secrets: inherit`
- `nightly.yml` calls all 6 in parallel then runs `notify-slack` job
- `on-dispatch.yml` handles per-SDK PR gates via `repository_dispatch` from SDK repos
- PAT (`CROSSMINT_E2E_BOT_TOKEN`) needs `Contents: Read and write` for `repository_dispatch` API
- Maestro flows: `flows/auth/login.yaml`; utilities: `utils/` (generateEmail.js, getOtp.js, sleep.js)
- Slack notification: `scripts/notify-slack.js` (Block Kit, per-platform rows with duration + pass/fail counts)
- GitHub Step Summary: `scripts/write-step-summary.js` (parses JUnit XML → markdown table)

---

## Key fixes applied (all on `main`)

| Date | Fix | PR |
|---|---|---|
| 2026-06-08 | Extracted 6 dedicated workflow files from 2 monolithic ones; added Slack Block Kit notification, per-attempt logs, GitHub Step Summary | PR #1–5 |
| 2026-06-08 | `nightly.yml`: switched Swift + Kotlin `sdk_ref` from feature branch to `main` after PRs merged | PR #6 |
| 2026-06-08 | `e2e-swift-ios.yml`: added `xcrun simctl keychain reset` before pre-warm to prevent stale JWT loop on startup | PR #7 |
| 2026-06-08 | All 3 iOS workflows: 2-attempt retry loop (keychain reset + app terminate + 5s sleep between attempts); `login.yaml`: 1500ms sleep after `pressKey: enter` on iOS to let keyboard dismiss before `tapOn send-code-button` | PR #7 |

---

## Open Linear tickets

| Ticket | Description | Priority |
|---|---|---|
| GEN-2353 | Rename `logout-button` accessibility ID → `account-menu-button` across all 4 SDK repos + `login.yaml` | Low |
| WAL-10541 | Swift SDK: `DefaultAuthManager.performJWTRefresh` should map all JWT errors to `.nonAuthenticated` to prevent infinite auth loop on startup | High |

---

## Retry loop pattern (all 3 iOS workflows)

On Maestro failure: `xcrun simctl keychain "$SIMULATOR_UDID" reset` + `simctl terminate <APP_ID>` + `sleep 5`, then re-run.
Per-attempt logs: `test-results/maestro-output-attempt{1,2}.log`; last log copied to `maestro-output.log`.

---

## Flutter iOS keyboard fix (`flows/auth/login.yaml`)

After `inputText` on the email field, `pressKey: enter` dismisses the keyboard on iOS. A `sleep.js` spin-wait of 1500ms follows to let the dismiss animation complete before `tapOn send-code-button`. Flutter's layout overflows 6px while the keyboard is open, clipping the button below the viewport.

---

## Known flakiness / open issues

- **RN iOS**: `expo-secure-store` "Callback was already called" error can crash the Maestro driver → "Unknown error". Retry loop mitigates it. Root cause is an app-level bug in the RN playground.
- **RN Android**: ADB daemon can die before Metro starts → `exit code 20` → emulator teardown hangs 40+ min → hits the 45-min job timeout. Pure infrastructure flakiness; no workaround beyond the job timeout.
- **Swift iOS auth loop**: Fixed in CI via keychain reset; SDK fix tracked in WAL-10541.
