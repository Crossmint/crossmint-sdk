# payments-playground-expo

Three identity-verification demos behind a runtime picker, the React Native counterpart to
[onramp-embedded-quickstart#27](https://github.com/Crossmint/onramp-embedded-quickstart/pull/27).
This is a QA harness, not a quickstart. The debug panel and the paste-in fields exist to check
invariants on a device and are not integration patterns to copy.

| Pill | Renders | Exercises |
|---|---|---|
| Checkout KYC | embedded checkout, no extra prop | checkout rendering the verification step itself |
| Merchant KYC | checkout with `identityVerificationHandling="external"`, plus this app's own slot | the merchant escape hatch |
| Standalone | `CrossmintIdentityVerification` alone, no checkout on the screen | the hosted `/sdk/unstable/identity-verification` route |

Switching pills unmounts the run and clears the event log, so you flip between them without a
restart. The typed order values survive the switch, since flipping Checkout KYC against Merchant KYC
on one order is the main comparison.

## Setup

```
echo 'EXPO_PUBLIC_CROSSMINT_API_KEY=ck_staging_…' > .env
pnpm install
pnpm ios      # or: pnpm android
```

Use the client key from the staging project on the `CROSSMINT` trust policy
(`146de1f3-a5db-49a7-b9bd-152ab7a808b1`, keys in `~/dev/kyc-e2e-harness/testing-project.env`). It is
the only policy that mints a Persona inquiry.

`pnpm ios` and `pnpm android` run a native build rather than Expo Go, which is required: the camera
permissions below live in `app.json` and only reach the app through a prebuild.

## Known blocker: the iOS build fails on Xcode 26.6

`pod install` succeeds, and then the `fmt` target fails to compile with five errors of the form
`call to consteval function 'fmt::basic_format_string<...>' is not a constant expression` in
`Pods/fmt/include/fmt/format-inl.h`. `fmt 11.0.2` is pinned exactly by `RCT-Folly 2024.11.18.00`,
which React Native 0.82.1 brings in, and that version predates fmt's fix for clang's stricter
`consteval` handling. `FMT_USE_CONSTEVAL=0` reaches the compiler but does not suppress it.

Nothing in this app references fmt, and `apps/wallets/expo` is on the same React Native version, so
this hits any iOS build in the repo on this toolchain. CI runs `ubuntu-latest` with no native build
step and the repo pins no Xcode version, so nothing catches it. Getting past it means an older
Xcode, a React Native bump, or a patched fmt, and that decision belongs outside this app.

## Feeding it an order

There is no server half, so nothing here holds a `sk_` key or creates orders. Mint on your laptop and
paste the result in:

```
cd ~/dev/kyc-e2e-harness && ./mint-inquiry.sh
```

Checkout KYC and Merchant KYC take `orderId` and `clientSecret`. Standalone takes the `inq_…` on its
own and never touches an order, which is how you check a deployed verification page with only a
client key: the route takes `credentials`, and Persona resolves template and environment from the
inquiry, so a staging inquiry renders its sandbox form against any host.

`mint-inquiry.sh` prints `status` and `inquiryId` today. Checkout KYC and Merchant KYC need two more
lines in its node tail for `order.id` and the root `clientSecret`.

## Camera

`app.json` declares `android.permission.CAMERA` and `NSCameraUsageDescription`. Neither the SDK's
Expo config plugin nor the WebView props set these up, so a merchant app that mounts
`CrossmintIdentityVerification` without them gets the document-upload path and silent failure on live
capture. If capture still fails with the permissions granted, the next thing to try is
`mediaCapturePermissionGrantType="grant"` on the WebView inside
`packages/client/ui/react-native/src/components/identity-verification/CrossmintIdentityVerification.tsx`.
See `~/dev/identity-verification-device-test-protocol.md` for the run A/run B framing.

**A physical device only.** Simulator and emulator camera behavior is not evidence for a permission
question.

## What the panel shows

| Row | Meaning |
|---|---|
| `checkout webview` | measured height of the checkout WebView, `absent` when unmounted |
| `identity webview` | measured height of the verification WebView |
| `identity mounted` | `EXPECTED, NOT MOUNTED` when the mode wants a verification view and none appeared |

Heights come from `onLayout`, so they report what the platform measured after the SDK applied
`ui:height.changed`. The event log prints the payment status next to the phase, because verification
happens inside phase `payment` while the status sits at `requires-kyc`.

Two rows from the web panel have no counterpart here. There is no "identity iframe location" row,
because the verification view mounts in this app's own tree by construction. The bug that row guards
against on web, two same-origin iframes overwriting each other's `ui:height.changed`, cannot happen
in React Native: each WebView carries its own `onMessage` and its own `WebViewParent` bound to a ref,
so no shared message bus exists to collide on. There is also no "checkout src flag" row, because
nothing outside the SDK can read the checkout WebView's URI. That invariant is asserted in
`packages/client/base/src/services/embed/v3/crossmint-embedded-checkout-v3-service.test.ts` instead.

## Expected results

```
                 checkout webview   identity webview   identity mounted
Checkout KYC          grows to fit             absent                n/a
Merchant KYC                   0px       grows to fit                yes
Standalone                  absent       grows to fit                yes
```

Merchant KYC is the case worth watching: a real Persona form in this app's dashed slot with checkout
collapsed to 0px.
