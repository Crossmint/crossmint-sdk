# @crossmint/client-sdk-window

## 1.1.1

### Patch Changes

- 7d99607: `EventEmitter` no longer logs `console.error` for a timeout it hands back to the caller as a rejection.

  `sendAction` and `onAction` reject on timeout, and `sendAction` also rejects once it exhausts `maxRetries`. Each of those rejections was preceded by a `console.error`, so a caller that catches the rejection and recovers still left an error behind. Only the caller knows whether a timeout is fatal — `CrossmintWalletProvider` retries the WebView handshake twice and logs `handshake.error` itself if those run out.

  On React Native the duplicate is not just noise. `console.error` raises a LogBox notification, which renders on top of the app: a handshake that timed out at 30s and succeeded on retry 16s later left a toast covering the bottom of the screen, over the app's own controls.

- cfa9710: `WindowTransport` now matches `event.source` against the peer window instead of trusting the origin alone.

  Each client subscribes to the global `message` event and accepted anything arriving from a matching origin. With one Crossmint iframe per page, no other frame could send from that origin, so the gap stayed invisible. Put two on a page and each client receives the other's events.

  Embedded checkout with `identityVerificationHandling="external"` puts two on the page. The verification iframe sends `ui:height.changed` at 660, the checkout iframe takes that height after collapsing to 0, and the merchant gets 660px of empty space above their widget. Reverse the order and checkout's 0 reaches the verification iframe and hides the Persona form.

  A message whose sending window has closed carries a null source. The transport drops it.

  OAuth login moves its listeners onto the popup it opens. They used to sit on a `ChildWindow` built over `window.opener || window.parent`, which on a merchant's top-level page resolves to that page's own window, so the peer never matched the popup the callback arrives from. That client only ever listened, never sent, so the mismatch was invisible until the peer became part of the receive path. Attaching to the popup also unsubscribes correctly between attempts, where the previous `off(eventName)` calls passed an event name to an API that takes a listener id and silently did nothing.

## 1.1.0

### Minor Changes

- 2dbcdee: On iOS the non-custodial signer stops relying on the signer webview's storage, which isn't reliable across launches and could drop the signer and break signing. The frame now uses non-persistent storage with in-memory key storage, and reloads to re-onboard with a fresh OTP before each signature. Android keeps its existing persistent behavior.

  It also recovers the OTP flow when the frame reloads mid-onboarding: the signer detects the reload, requests a fresh code, and keeps the prompt open so the user can enter the new one.

## 1.0.10

### Patch Changes

- 1398b65: Adds a `PopupWindow.initEmpty()` helper to open about:blank synchronously.

## 1.0.9

### Patch Changes

- a356f13: Improve logging across approve/send transaction flow: remove verbose console.log noise from EventEmitter/Handshake/Transport layers, replace console.warn/error with structured walletsLogger in NCS signers, add timing for TEE operations

## 1.0.8

### Patch Changes

- cdcec95: Prevent concurrent handshakes

## 1.0.7

### Patch Changes

- 25ad566: Updates dependencies

## 1.0.6

### Patch Changes

- 978420c: Updates React to patched version

## 1.0.5

### Patch Changes

- 1034e0f: Minor issues with retries in event handling

## 1.0.4

### Patch Changes

- b9fd4ed: Temporary logs

## 1.0.3

### Patch Changes

- 2ad2a06: Fix Window Transport Error

## 1.0.2

### Patch Changes

- deff029: Reverted change
- 220e9c9: Revert and fix code related to window source checking

## 1.0.1

### Patch Changes

- 99171e9: Safe URL parsing
- 689e639: Same source checking
- b573834: Improve randomness source

## 1.0.0

### Major Changes

- 5acfc2f: Refactors to support multiple different transport options and adds webview

## 0.2.3

### Patch Changes

- 3712dd5: Updating the `nanoid` dependency to fix the [CVE-2024-55565](https://nvd.nist.gov/vuln/detail/cve-2024-55565) security vulnerability.

## 0.2.2

### Patch Changes

- 75f80cf: revert: pnpm catalog

## 0.2.1

### Patch Changes

- e267c9f: chore: remove source maps

## 0.2.0

### Minor Changes

- 548c4d9: feat: hosted v3 alpha

## 0.1.0

### Minor Changes

- 63ea1dc: allow many origins
- 88a801d: feat: embed v3 initial alpha release

## 0.0.10

### Patch Changes

- 2979be2: Refactor popup window as sometimes the promise never ends

## 0.0.9

### Patch Changes

- 11a9bb8: Add Cross origin option

## 0.0.8

### Patch Changes

- dbca75f: Releasing Window SDK to be used in cross origin communication

## 0.0.7

### Patch Changes

- 66ec4fb: Initial release of window SDK
