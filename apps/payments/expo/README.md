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
cat > .env <<'EOF'
EXPO_PUBLIC_CROSSMINT_API_KEY=ck_staging_…
EXPO_PUBLIC_DEMO_ORDER_ID=
EXPO_PUBLIC_DEMO_CLIENT_SECRET=
EXPO_PUBLIC_DEMO_INQUIRY_ID=
EOF
pnpm install
pnpm android  # or pnpm ios, after the fmt bump below
```

The three `DEMO_` vars seed the input fields. They are optional but close to required in practice: the
`clientSecret` is a 276-character JWT, and nobody is typing that on a phone keyboard. Metro inlines
`EXPO_PUBLIC_*` at bundle time, so restart it after editing `.env`.

Use the client key from the staging project on the `CROSSMINT` trust policy
(`146de1f3-a5db-49a7-b9bd-152ab7a808b1`, keys in `~/dev/kyc-e2e-harness/testing-project.env`). It is
the only policy that mints a Persona inquiry.

`pnpm ios` and `pnpm android` run a native build rather than Expo Go, which is required: the camera
permissions below live in `app.json` and only reach the app through a prebuild.

## The iOS build needs an fmt bump on Xcode 26.6

Out of the box, `pod install` succeeds and then the `fmt` target fails with five errors of the form
`call to consteval function 'fmt::basic_format_string<...>' is not a constant expression` in
`Pods/fmt/include/fmt/format-inl.h`. React Native 0.82.1 hardcodes `fmt 11.0.2` in
`third-party-podspecs/fmt.podspec` and pins it exactly from
`third-party-podspecs/RCT-Folly.podspec:28`, and that fmt predates clang's stricter `consteval`
handling. `set_fmt_config()` cannot help: it carries only the git URL, not the version.
`FMT_USE_CONSTEVAL=0` does not help either, confirmed reaching the compiler on all 158 fmt
invocations with the errors unchanged.

Nothing in this app references fmt, and `apps/wallets/expo` is on the same React Native version, so
this hits any iOS build in the repo on this toolchain. CI runs `ubuntu-latest` with no native build
step and the repo pins no Xcode, so nothing catches it.

**fmt 12.1.0 fixes it.** Verified: BUILD SUCCEEDED with zero errors, app installed and launched on an
iOS 26.5 simulator. Upstream made the same move, and non-monotonically, so the version table matters:

| React Native | fmt |
|---|---|
| 0.82.1 (current), 0.83.0, 0.84.0, 0.84.1 | 11.0.2 |
| 0.83.10, 0.85.3, 0.86.2, 0.87.0 | 12.1.0 |

Both 0.82.1 and 0.83.10 use Folly `2024.11.18.00`, so bumping fmt alone reproduces exactly the
third-party pairing upstream ships in 0.83.10 rather than inventing a combination.

That argues for patching fmt over bumping React Native. `react-native` is a repo-wide
`pnpm.overrides` entry in the root `package.json`, so a bump moves both Expo apps and the SDK's
effective React Native at once, and the repo is already ahead of Expo SDK 54, whose
`bundledNativeModules.json` expects `0.81.5`. That existing gap is why the SDK's config plugin
injects a `post_install` hook re-adding `ReactCommon/CallInvoker.h` for expo-modules-core. Going to
0.83+ widens a mismatch the SDK already hand-patches, and 0.83.10 is a backport-only patch release
that 0.84 regressed away from.

The durable form is a `pnpm.patch` on react-native changing three version strings (`spec.version` and
`:tag` in `fmt.podspec`, the `spec.dependency` in `RCT-Folly.podspec`) from `11.0.2` to `12.1.0`, then
`pod update fmt RCT-Folly`. Note that `pod install` alone is not enough after the change: the existing
`Podfile.lock` pins `fmt (= 11.0.2)` and CocoaPods reports a version conflict until you update those
two pods explicitly. That patch is not committed here, since it is a repo-wide dependency decision.

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

`mint-inquiry.sh` prints `orderId` and `clientSecret` alongside `status` and `inquiryId`.

**Mint immediately before you run.** The order does not hold `requires-kyc` for long. One minted here
had already fallen back to `payment.status: requires-quote` with `payment.preparation.kyc` gone when
re-read 38 minutes later, which takes the credentials with it and leaves Merchant KYC with an empty
slot. If the panel shows `EXPECTED, NOT MOUNTED` and the event log reports a phase other than
`payment`, the order went stale rather than the SDK misbehaving. Mint a fresh one.

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

## Measured results

Run on an Android emulator, API 36 arm64-v8a, WebView 133.0.6943.137, against a live staging order at
`payment.status: requires-kyc`. All three modes reached a real Persona sandbox form.

```
                 checkout webview   identity webview   identity mounted
Checkout KYC                660px             absent                n/a
Merchant KYC                  0px              660px                yes
Standalone                 absent              660px                yes
```

Those numbers match the web harness in onramp-embedded-quickstart#27 exactly, including the 660px.
Merchant KYC is the case worth watching, and it works: a real Persona form in this app's dashed slot
with checkout collapsed to 0px, event log reading `order phase: payment status: requires-kyc` then
`identity ready`.

The checkout page polls, so `order:updated` arrives every few seconds and rebuilds the credentials
object each time. The identity WebView does not reload on those: one run logged 22 `order:updated`
against a single `kyc:ready`, so the fresh-but-equal object does not churn the WebView source.

**Camera capture is not covered here.** An emulator cannot answer it: see
`~/dev/identity-verification-device-test-protocol.md`, which requires a physical device on the grounds
that simulated camera behavior is not evidence for a permission question. What this run does establish
is that the manifest declaration alone is not enough. After install, `dumpsys package` reports
`android.permission.CAMERA: granted=false`, because it is a runtime permission and neither the SDK nor
its Expo config plugin requests it. A merchant app mounting `CrossmintIdentityVerification` has to
request it itself, and nothing in the SDK says so.

## A caveat the hook inherits

`CrossmintCheckoutProvider` never clears its order. Once checkout broadcasts one, `useCrossmintCheckout`
and therefore `useIdentityVerificationCredentials` keep returning it after the checkout component
unmounts, with no way for a merchant to reset the context. This harness hit it: switching modes runs
`startOver()`, which clears local state but leaves the SDK context populated, so a credentials-only
check claimed a verification view was missing when nothing was mounted at all. The panel now gates on
something actually being mounted. A merchant swapping one order for another should expect the previous
order's credentials until the next `order:updated` lands.
