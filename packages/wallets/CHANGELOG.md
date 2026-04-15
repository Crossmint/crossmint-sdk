# @crossmint/wallets-sdk

## 1.0.12

### Patch Changes

- 28a7957: fix: handle API-sourced recovery configs without secret in isRecoverySigner
  - @crossmint/common-sdk-auth@1.1.6

## 1.0.11

### Patch Changes

- @crossmint/common-sdk-auth@1.1.5

## 1.0.10

### Patch Changes

- e03e7b1: Fix: preserve local device key when user cancels OTP during recovery, preventing duplicate device signers on page refresh
- 560fbf0: fix: require `status` in `wallet.transfers()` types to match backend validation
- 0792f9e: fix: make addSigner idempotent by resuming pending operations on retry

## 1.0.9

### Patch Changes

- 60f31bd: Fix false "Device signer key storage is required" error when creating wallets server-side with a client-created device signer
- b9225cf: Fix `needsRecovery()` returning stale `false` after `getWallet()` by awaiting signer initialization in the wallet factory. Also fix `recover()` non-device signer early-return not clearing `needsRecovery`.
  - @crossmint/common-sdk-auth@1.1.4

## 1.0.8

### Patch Changes

- 612d768: Ensure signer is authenticated before calling approve

## 1.0.7

### Patch Changes

- Updated dependencies [80538a9]
  - @crossmint/client-signers-cryptography@0.0.5

## 1.0.6

### Patch Changes

- 8743da2: Fix device signer recovery when local key lookup fails

  - Prevent assembling a device signer with an empty locator when `getKey()` returns null during initialization
  - Make `recover()` search all registered device signers for a local key match before generating a new one
  - Make "already approved" error detection more robust with looser string matching
  - Extract `resumePendingDeviceSignerApproval` and `findLocalDeviceSigner` helpers for clarity

- fc14bbf: Include README.md in published npm packages

  The `files` field in package.json was missing `README.md`, which prevented READMEs from appearing on npm package pages.

- cf42378: Can remove a signer from a wallet
- Updated dependencies [fc14bbf]
  - @crossmint/common-sdk-auth@1.1.3

## 1.0.5

### Patch Changes

- 36169eb: Fix spurious 400 API call to empty device locator when no matching device key is found locally

  Fix OTP dialog not appearing during recovery flow when using EVMWallet.from(wallet).sendTransaction(). The dialog's open condition previously required wallet.signer.type === "email", which fails during recovery because the wallet's public signer remains a device signer. Now uses the active auth signer info from the onAuthRequired callback instead.

- ab768c6: fix: skip auto-assembly for non-assemblable signer types (e.g. evm-keypair from API)

## 1.0.4

### Patch Changes

- @crossmint/common-sdk-auth@1.1.2

## 1.0.3

### Patch Changes

- @crossmint/common-sdk-auth@1.1.1

## 1.0.2

### Patch Changes

- e2dbee9: Reject device signers for Solana wallets with a clear error message instead of letting the request fail with a 500. Includes a contact sales link for access.

## 1.0.1

### Patch Changes

- b701730: Patch bump to publish v1.0.1 — v1.0.0 was already occupied by a stale release on npm and could not be overwritten by the changeset release action.

## 1.0.0

### Major Changes

- 02ac7bc: Make device signer the default operational signer (WAL-9287).

  BREAKING CHANGES:

  - Removed `signer` property from `WalletArgsFor` and `WalletCreateArgs`
  - `recovery` is now required on `WalletCreateArgs`
  - Removed `assembleSigner` public method from `CrossmintWallets`
  - Removed `onChangeSigner` callback
  - Removed `getOrCreateWallet` from React provider public API; use `getWallet` and `createWallet` separately
  - `getWallet` now accepts `alias` instead of `signer`

- 02ac7bc: Add support for Delegated Signers.
- 02ac7bc: Remove experimental\_ prefixes from wallets SDK public API

  BREAKING CHANGE: All experimental\_ prefixed APIs have been graduated to stable with new names:

  - `experimental_prepareOnly` -> `prepareOnly`
  - `experimental_callbacks` -> `_callbacks`
  - `experimental_loginWithOAuth` -> `loginWithOAuth`
  - `experimental_getNfts` -> `getNfts` / `nfts`
  - `experimental_activity` -> `getTransfers` / `transfers`
  - `experimental_signer` -> `signer`
  - `experimental_approval` -> `approval`
  - `experimental_transaction` -> `transaction`
  - `experimental_transactions` -> `transactions`

- 02ac7bc: BREAKING CHANGE: Remove owner parameter from client-side getOrCreateWallet calls

  The `owner` field can no longer be specified in client-side `getOrCreateWallet` calls. Owner is now determined from JWT authentication.

  Migration: Remove the `owner` parameter from any client-side wallet creation calls. The owner is automatically determined from the authenticated user's JWT token.

- 02ac7bc: Split getOrCreateWallet into separate getWallet and createWallet methods, both working client and server side. Make signer optional for read-only wallets. Add device signer resolution logic in getWallet. Add createDeviceSigner helper function. Support device signers with pre-existing locators.
- 02ac7bc: BREAKING: Rename SDK-facing terminology: adminSigner to recovery, delegatedSigners to signers, addDelegatedSigner() to addSigner(), delegatedSigners() to signers(). API layer unchanged.

### Minor Changes

- 02ac7bc: Device signer can be used in new devices. During the first transaction it will automatically create a device signer before running the transaction
- 02ac7bc: Add human-readable device name to device signers.

  - Added `name` field to `DeviceSignerConfig` and `DeviceSignerDescriptor`
  - Added abstract `getDeviceName()` method to `DeviceSignerKeyStorage`
  - `IframeDeviceSignerKeyStorage` derives the name from `navigator.userAgent` (e.g. "Chrome on Mac")
  - `NativeDeviceSignerKeyStorage` uses `expo-device` APIs for real native device names (e.g. "iPhone 15 (iOS)")
  - Both `registerSigners` (wallet creation) and `addSigner` (recovery) now send the device name to the API

- 02ac7bc: Homogenize signer management to always use full objects with approval status

  - `addSigner()` now accepts full signer config objects (`SignerConfigForChain<C>`) instead of locator strings
  - `addSigner()` returns a `DelegatedSigner` with approval status
  - `signers()` returns full `DelegatedSigner` objects, filtered to only include signers that exist for the instantiated chain
  - New `SignerStatus` and `DelegatedSigner` types are exported

- 02ac7bc: Browser Device Key support with Iframe Key Storage
- 02ac7bc: Remove biometric policy from device signers. Only "none" policies are now created, which is the default for the iframe.
- 02ac7bc: Remove deprecated customAuth (experimental_customAuth, experimental_setCustomAuth, CustomAuth type) from the SDK. All authentication now uses the setJwt/crossmint.jwt pattern instead.
- 02ac7bc: Rename DelegatedSigner to Signer and AdminSignerConfig to RecoverySignerConfig.

  The exported type `DelegatedSigner` has been renamed to `Signer`. `DelegatedSignerInput` → `SignerInput`, `AdminSignerConfig` → `RecoverySignerConfig`. The internal `Signer` interface (signing mechanism adapter) has been renamed to `SignerAdapter` and is now publicly exported for consumers using `additionalSigners`.

- 02ac7bc: Add device signer support
- 02ac7bc: Breaking: `useSigner()` now only accepts signer config objects + recovery signer support

  - **Breaking:** `useSigner()` no longer accepts locator strings — only signer config objects (`SignerConfigForChain<C>`)
  - `useSigner()` now accepts the wallet's recovery (admin) signer in addition to delegated signers
  - Recovery signers skip the delegated signer registration check
  - External-wallet signers (both recovery and delegated) require the full config object with an `onSign` callback
  - All signer types must be passed as config objects (e.g. `{ type: "email", email: "..." }`)

- 02ac7bc: feat: unify OTP signer API with useWalletOtpSigner hook and showOtpSignerPrompt prop

  - Replace `headlessSigningFlow` with `showOtpSignerPrompt` (defaults to `true`) for consistent opt-in/opt-out of built-in OTP UI across both react-ui and react-native
  - Rename `emailSignerState` to `otpSignerState` in the wallet context to reflect support for both email and phone OTP signers
  - Rename `sendEmailWithOtp` to `sendOtp` across the SDK to unify email and phone OTP signer APIs
  - Add new `useWalletOtpSigner` hook in react-base, exported from both react-ui and react-native-ui
  - Deprecate `useWalletEmailSigner` in react-native in favor of `useWalletOtpSigner`

### Patch Changes

- 02ac7bc: Add SDK logger decorator to device signer key storage methods for improved observability
- 02ac7bc: Add client-side validation for recipient addresses in wallet.send(). Invalid addresses now throw an `InvalidAddressError` immediately instead of making a round-trip to the server.
- 02ac7bc: fix: check device signer approval instead of needsRecovery flag in recover()

  Replaces the needsRecovery() flag check with an actual signerIsRegistered() call to verify
  whether the device signer is approved on the wallet. This fixes the case where the recovery
  signer does not require auth and there is no device signer, causing recover() to skip
  registration.

- 02ac7bc: Handle device signer IDB fatal errors with iframe reload and retry
- 02ac7bc: Fix createWallet failing when a device signer descriptor from createDeviceSigner() is passed in signers[]. The publicKey.x/y hex values are now normalized to decimal before comparison during idempotency validation.
- 02ac7bc: fix: preserve external-wallet recovery signer config (onSign callback) during wallet instantiation
- 02ac7bc: Remove incorrect signer mention from getWallet JSDoc description.
- 02ac7bc: fix: pass full passkey signer config in addSigner to preserve publicKey
- 02ac7bc: Fix server recovery wallets auto-approve for addSigner

  - Preserve user-provided recovery config (with secret) during wallet creation so server recovery signers can properly auto-approve addSigner operations
  - Use buildInternalSignerConfig for recovery signer assembly in addSigner, which correctly derives server signer keys

- 02ac7bc: fix: prevent duplicate TEE initialization race condition in NonCustodialSigner

  Stores the constructor's initialize() promise in \_initializationPromise so that
  getTEEConnection() can detect an in-flight initialization and await it instead
  of starting a parallel one, preventing duplicate iframe/TEE attestation.

- 02ac7bc: fix: make tokens and status optional in wallet.transfers()
- 02ac7bc: Validate transfer amount in wallet.send() to reject zero, negative, and non-numeric values before sending on-chain. Throws InvalidTransferAmountError for invalid amounts.
- 02ac7bc: Improve error messages when server wallet signer is missing. Instead of a generic "read-only" error, the SDK now provides context-specific guidance for server signers, external-wallet signers, and wallets with multiple signers. Also adds a warning log when auto-assembly of the default signer fails.
- 02ac7bc: Default for recovery or one server signer
- 02ac7bc: Reject unknown chain names in createWallet and getWallet with an InvalidChainError before any wallet resource is created
- 02ac7bc: Remove @stellar/stellar-sdk dependency by replacing it with tweetnacl (already a dependency) for ed25519 operations and a local Stellar StrKey encoder ported from open-signer.
- 02ac7bc: If a signer is in a pending state, approve it and then use it'
- 02ac7bc: Support Solana Device Signer
- 02ac7bc: Defaulting signer
- 02ac7bc: Simplify null check in recover() and make apiClient publicly accessible
- 02ac7bc: Fix createDeviceSigner always generating a new key instead of reusing an existing one for the same address on the same device
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
- Updated dependencies [02ac7bc]
  - @crossmint/common-sdk-base@0.10.0
  - @crossmint/common-sdk-auth@1.1.0

## 1.0.0-beta.6

### Patch Changes

- 003e632: Remove incorrect signer mention from getWallet JSDoc description.
- f5517fc: fix: pass full passkey signer config in addSigner to preserve publicKey
- e38e91b: Improve error messages when server wallet signer is missing. Instead of a generic "read-only" error, the SDK now provides context-specific guidance for server signers, external-wallet signers, and wallets with multiple signers. Also adds a warning log when auto-assembly of the default signer fails.
- bac3bd4: If a signer is in a pending state, approve it and then use it'

## 1.0.0-beta.5

### Minor Changes

- 258779d: Rename DelegatedSigner to Signer and AdminSignerConfig to RecoverySignerConfig.

  The exported type `DelegatedSigner` has been renamed to `Signer`. `DelegatedSignerInput` → `SignerInput`, `AdminSignerConfig` → `RecoverySignerConfig`. The internal `Signer` interface (signing mechanism adapter) has been renamed to `SignerAdapter` and is now publicly exported for consumers using `additionalSigners`.

### Patch Changes

- 2d92c5a: fix: preserve external-wallet recovery signer config (onSign callback) during wallet instantiation
- 512015a: Default for recovery or one server signer
- 05f3feb: Fix createDeviceSigner always generating a new key instead of reusing an existing one for the same address on the same device

## 1.0.0-beta.4

### Patch Changes

- 72a6c13: Fix server recovery wallets auto-approve for addSigner

  - Preserve user-provided recovery config (with secret) during wallet creation so server recovery signers can properly auto-approve addSigner operations
  - Use buildInternalSignerConfig for recovery signer assembly in addSigner, which correctly derives server signer keys

- 7f45e33: Remove @stellar/stellar-sdk dependency by replacing it with tweetnacl (already a dependency) for ed25519 operations and a local Stellar StrKey encoder ported from open-signer.

## 1.0.0-beta.3

### Minor Changes

- d5c0df7: Add human-readable device name to device signers.

  - Added `name` field to `DeviceSignerConfig` and `DeviceSignerDescriptor`
  - Added abstract `getDeviceName()` method to `DeviceSignerKeyStorage`
  - `IframeDeviceSignerKeyStorage` derives the name from `navigator.userAgent` (e.g. "Chrome on Mac")
  - `NativeDeviceSignerKeyStorage` uses `expo-device` APIs for real native device names (e.g. "iPhone 15 (iOS)")
  - Both `registerSigners` (wallet creation) and `addSigner` (recovery) now send the device name to the API

- 6038b09: Breaking: `useSigner()` now only accepts signer config objects + recovery signer support

  - **Breaking:** `useSigner()` no longer accepts locator strings — only signer config objects (`SignerConfigForChain<C>`)
  - `useSigner()` now accepts the wallet's recovery (admin) signer in addition to delegated signers
  - Recovery signers skip the delegated signer registration check
  - External-wallet signers (both recovery and delegated) require the full config object with an `onSign` callback
  - All signer types must be passed as config objects (e.g. `{ type: "email", email: "..." }`)

### Patch Changes

- 4e5bc75: Add client-side validation for recipient addresses in wallet.send(). Invalid addresses now throw an `InvalidAddressError` immediately instead of making a round-trip to the server.
- d66aacc: Fix createWallet failing when a device signer descriptor from createDeviceSigner() is passed in signers[]. The publicKey.x/y hex values are now normalized to decimal before comparison during idempotency validation.
- 116111d: fix: make tokens and status optional in wallet.transfers()
- 5ae2806: Validate transfer amount in wallet.send() to reject zero, negative, and non-numeric values before sending on-chain. Throws InvalidTransferAmountError for invalid amounts.
- 6eb5217: Reject unknown chain names in createWallet and getWallet with an InvalidChainError before any wallet resource is created
- d0c8820: Defaulting signer
- 09e9ce2: Simplify null check in recover() and make apiClient publicly accessible
- Updated dependencies [4e5bc75]
  - @crossmint/common-sdk-base@0.10.0-beta.1
  - @crossmint/common-sdk-auth@1.1.0-beta.1

## 1.0.0-beta.2

### Minor Changes

- 534e27d: Homogenize signer management to always use full objects with approval status

  - `addSigner()` now accepts full signer config objects (`SignerConfigForChain<C>`) instead of locator strings
  - `addSigner()` returns a `DelegatedSigner` with approval status
  - `signers()` returns full `DelegatedSigner` objects, filtered to only include signers that exist for the instantiated chain
  - New `SignerStatus` and `DelegatedSigner` types are exported

### Patch Changes

- d09537e: fix: check device signer approval instead of needsRecovery flag in recover()

  Replaces the needsRecovery() flag check with an actual signerIsRegistered() call to verify
  whether the device signer is approved on the wallet. This fixes the case where the recovery
  signer does not require auth and there is no device signer, causing recover() to skip
  registration.

## 1.0.0-beta.1

### Patch Changes

- e60df98: fix: prevent duplicate TEE initialization race condition in NonCustodialSigner

  Stores the constructor's initialize() promise in \_initializationPromise so that
  getTEEConnection() can detect an in-flight initialization and await it instead
  of starting a parallel one, preventing duplicate iframe/TEE attestation.

## 1.0.0-beta.0

### Major Changes

- c51a407: Make device signer the default operational signer (WAL-9287).

  BREAKING CHANGES:

  - Removed `signer` property from `WalletArgsFor` and `WalletCreateArgs`
  - `recovery` is now required on `WalletCreateArgs`
  - Removed `assembleSigner` public method from `CrossmintWallets`
  - Removed `onChangeSigner` callback
  - Removed `getOrCreateWallet` from React provider public API; use `getWallet` and `createWallet` separately
  - `getWallet` now accepts `alias` instead of `signer`

- 67920a5: Add support for Delegated Signers.
- 820c2ec: Remove experimental\_ prefixes from wallets SDK public API

  BREAKING CHANGE: All experimental\_ prefixed APIs have been graduated to stable with new names:

  - `experimental_prepareOnly` -> `prepareOnly`
  - `experimental_callbacks` -> `_callbacks`
  - `experimental_loginWithOAuth` -> `loginWithOAuth`
  - `experimental_getNfts` -> `getNfts` / `nfts`
  - `experimental_activity` -> `getTransfers` / `transfers`
  - `experimental_signer` -> `signer`
  - `experimental_approval` -> `approval`
  - `experimental_transaction` -> `transaction`
  - `experimental_transactions` -> `transactions`

- ede1aac: BREAKING CHANGE: Remove owner parameter from client-side getOrCreateWallet calls

  The `owner` field can no longer be specified in client-side `getOrCreateWallet` calls. Owner is now determined from JWT authentication.

  Migration: Remove the `owner` parameter from any client-side wallet creation calls. The owner is automatically determined from the authenticated user's JWT token.

- 5e1e86e: Split getOrCreateWallet into separate getWallet and createWallet methods, both working client and server side. Make signer optional for read-only wallets. Add device signer resolution logic in getWallet. Add createDeviceSigner helper function. Support device signers with pre-existing locators.
- 6e3fa39: BREAKING: Rename SDK-facing terminology: adminSigner to recovery, delegatedSigners to signers, addDelegatedSigner() to addSigner(), delegatedSigners() to signers(). API layer unchanged.

### Minor Changes

- 8c079bd: Device signer can be used in new devices. During the first transaction it will automatically create a device signer before running the transaction
- eb975c9: Browser Device Key support with Iframe Key Storage
- d29b7d3: Remove biometric policy from device signers. Only "none" policies are now created, which is the default for the iframe.
- 9b9f9db: Remove deprecated customAuth (experimental_customAuth, experimental_setCustomAuth, CustomAuth type) from the SDK. All authentication now uses the setJwt/crossmint.jwt pattern instead.
- 2445716: Add device signer support
- 74a05a1: feat: unify OTP signer API with useWalletOtpSigner hook

  - Rename `sendEmailWithOtp` to `sendOtp` across the SDK to unify email and phone OTP signer APIs
  - Add new `useWalletOtpSigner` hook in react-base, exported from both react-ui and react-native-ui
  - Deprecate `useWalletEmailSigner` in react-native in favor of `useWalletOtpSigner`

### Patch Changes

- 5b77229: Add SDK logger decorator to device signer key storage methods for improved observability
- 522b486: Handle device signer IDB fatal errors with iframe reload and retry
- d5283ab: Support Solana Device Signer
- Updated dependencies [9b9f9db]
- Updated dependencies [bf792d2]
  - @crossmint/common-sdk-base@0.10.0-beta.0
  - @crossmint/common-sdk-auth@1.1.0-beta.0

## 0.21.0

### Minor Changes

- e912d18: Add server key signers for EVM, Solana, and Stellar using HKDF-SHA256 key derivation, enabling server-to-server wallet operations without client-side key management.

### Patch Changes

- @crossmint/common-sdk-auth@1.0.73

## 0.20.2

### Patch Changes

- Updated dependencies [d5ce427]
- Updated dependencies [ec44b25]
  - @crossmint/common-sdk-auth@1.0.72
  - @crossmint/common-sdk-base@0.9.20

## 0.20.1

### Patch Changes

- 803e351: Add Tempo mainnet chain support
- Updated dependencies [803e351]
  - @crossmint/common-sdk-base@0.9.19
  - @crossmint/common-sdk-auth@1.0.71

## 0.20.0

### Minor Changes

- 454a9cc: Chain environment validation now throws an error when using testnet chains in production and automatically converts mainnet chains to their testnet equivalents in staging/development environments.

### Patch Changes

- f5bcec1: update tempo testnet details
- f969a28: Category: improvements
  Product Area: wallets

  Validate/auto-convert chains in Wallet balances/send/activity methods.

- Updated dependencies [f5bcec1]
  - @crossmint/common-sdk-base@0.9.18
  - @crossmint/common-sdk-auth@1.0.70

## 0.19.0

### Minor Changes

- 41ad396: Add chain environment validation for EVM wallets

  When creating or fetching an EVM wallet, the SDK now validates that the chain matches the environment:

  - Production environment: Only mainnet chains are allowed
    This prevents accidental use of testnet chains in production or mainnet chains in non-production environments. A warning is logged with a descriptive message when there is a mismatch, but the wallet operation still completes successfully.

  Category: improvements
  Product Area: wallets

### Patch Changes

- 4dc0dbf: Add missing JSDoc comments to wallet methods
- a356f13: Improve logging across approve/send transaction flow: remove verbose console.log noise from EventEmitter/Handshake/Transport layers, replace console.warn/error with structured walletsLogger in NCS signers, add timing for TEE operations
- ce13788: Add the transactionType field
- Updated dependencies [a356f13]
- Updated dependencies [27194e5]
- Updated dependencies [4dc0dbf]
  - @crossmint/client-sdk-window@1.0.9
  - @crossmint/common-sdk-base@0.9.17
  - @crossmint/common-sdk-auth@1.0.69

## 0.18.15

### Patch Changes

- Updated dependencies [4eb0dc6]
  - @crossmint/common-sdk-base@0.9.16
  - @crossmint/common-sdk-auth@1.0.68

## 0.18.14

### Patch Changes

- 38b9087: Fix issue where email signer was not found when creating wallet without createOnLogin

  client-sdk-react-base entry point should be now `CrossmintWalletBaseProvider` instead of `CrossmintWalletUIBaseProvider`

- 38b9087: Adds logs for email signer otp modal flow

## 0.18.13

### Patch Changes

- dbb338a: Remove chains parameter from balances() method - the wallet's default chain is now always used for balance queries, fixing a bug where passed chains were ignored during response processing.
- c0e68b2: Fix approval signer locator bug: use correct signer's locator in approval submissions instead of always using this.signer.locator(). This makes the additionalSigners option work correctly for delegated signers.
- Updated dependencies [944f239]
  - @crossmint/common-sdk-base@0.9.15
  - @crossmint/common-sdk-auth@1.0.67

## 0.18.12

### Patch Changes

- e8e63c0: Use datadog logger through http request instead of specific platform library
- Updated dependencies [e8e63c0]
  - @crossmint/common-sdk-base@0.9.14
  - @crossmint/common-sdk-auth@1.0.66

## 0.18.11

### Patch Changes

- Updated dependencies [cdcec95]
  - @crossmint/client-sdk-window@1.0.8
  - @crossmint/common-sdk-auth@1.0.65

## 0.18.10

### Patch Changes

- a4dee5e: change tempo currency
- Updated dependencies [a4dee5e]
  - @crossmint/common-sdk-base@0.9.13
  - @crossmint/common-sdk-auth@1.0.64

## 0.18.9

### Patch Changes

- b6e4d15: Support tempo testnet
- Updated dependencies [b6e4d15]
  - @crossmint/common-sdk-base@0.9.12
  - @crossmint/common-sdk-auth@1.0.63

## 0.18.8

### Patch Changes

- affbfc7: Reset handshake retry time
- be241bd: Supporting arc testnet
- Updated dependencies [be241bd]
  - @crossmint/common-sdk-base@0.9.11
  - @crossmint/common-sdk-auth@1.0.62

## 0.18.7

### Patch Changes

- a5f64e2: Modify retry policy

## 0.18.6

### Patch Changes

- e973bc2: Added SDK Datadog Logger
- 25ad566: Updates dependencies
- Updated dependencies [e973bc2]
- Updated dependencies [25ad566]
  - @crossmint/common-sdk-base@0.9.10
  - @crossmint/client-signers@0.1.2
  - @crossmint/client-sdk-window@1.0.7
  - @crossmint/common-sdk-auth@1.0.61

## 0.18.5

### Patch Changes

- 978420c: Updates React to patched version
- de77241: Fix owner comparison when email has a dot
- Updated dependencies [978420c]
  - @crossmint/client-signers@0.1.1
  - @crossmint/client-sdk-window@1.0.6
  - @crossmint/common-sdk-auth@1.0.60
  - @crossmint/common-sdk-base@0.9.9

## 0.18.4

### Patch Changes

- da7fbb1: Fix Non-custodial signer initialization when running in server-side environments
- 9ece4b2: Disable minification to prevent entire source code from being dumped in error stack traces, improving error readability.

## 0.18.3

### Patch Changes

- 8315976: Expose a wallet fund method
- Updated dependencies [dcbfab4]
  - @crossmint/common-sdk-base@0.9.8
  - @crossmint/common-sdk-auth@1.0.59

## 0.18.2

### Patch Changes

- Updated dependencies [9386174]
- Updated dependencies [25fbcf1]
  - @crossmint/client-signers@0.1.0

## 0.18.1

### Patch Changes

- @crossmint/common-sdk-auth@1.0.58

## 0.18.0

### Minor Changes

- 8fc9ed9: Adds support for exporting email and phone signer private keys

### Patch Changes

- 28e6fd3: Fix email signer validation to normalize Gmail addresses before comparison. Users with dotted Gmail addresses (e.g., jer.coffey@gmail.com) can now retrieve wallets without validation errors.

## 0.17.0

### Minor Changes

- 4ab93e0: Add wallet aliasing

## 0.16.2

### Patch Changes

- fb1cfdb: Adds Plume to supported chains
- Updated dependencies [fb1cfdb]
  - @crossmint/common-sdk-base@0.9.7

## 0.16.1

### Patch Changes

- a2c15a8: Fixed OTP verification error propagation

## 0.16.0

### Minor Changes

- 615b84b: Add experimental_prepareOnly support to addDelegatedSigner method
- d09fa2c: Add serialized transaction support for Solana wallets

## 0.15.1

### Patch Changes

- 1080158: Add @solana/web3.js as peer dependency to resolve VersionedTransaction type mismatches. Users with different @solana/web3.js versions will now use the exact SDK version (1.98.1) to ensure type compatibility.
- 758d224: Pre-initialize signer before creating a transaction
- Updated dependencies [1080158]
  - @crossmint/common-sdk-base@0.9.6

## 0.15.0

### Minor Changes

- 9812c0c: Skip unnecessary polling when signature is already complete. For non-custodial wallets, the backend now returns completed signatures directly from createSignatureRequest(), allowing the SDK to return the signature immediately without waiting.

## 0.14.3

### Patch Changes

- 635b217: Fix a bug of typedData not being properly managed for smart wallets in EVM

## 0.14.2

### Patch Changes

- 1034e0f: Minor issues with retries in event handling
- Updated dependencies [1034e0f]
  - @crossmint/client-sdk-window@1.0.5

## 0.14.1

### Patch Changes

- Updated dependencies [b9fd4ed]
  - @crossmint/client-sdk-window@1.0.4

## 0.14.0

### Minor Changes

- c18048b: Rename `serializedTransaction` parameter to `transaction` in Stellar wallet sendTransaction method

## 0.13.1

### Patch Changes

- 0b915b2: Adds support for delegated signers on wallet creation in EVM + Stellar

## 0.13.0

### Minor Changes

- 544c9bd: Add serialized transaction support for Stellar wallets

### Patch Changes

- 9a4fa46: Supports fetching delegated signers in Stellar

## 0.12.5

### Patch Changes

- Updated dependencies [04c5808]
  - @crossmint/common-sdk-base@0.9.5

## 0.12.4

### Patch Changes

- 08c2d57: Supports signer param in #send
- 08c2d57: Sets needsAuth to false when rejecting otp flow

## 0.12.3

### Patch Changes

- ecce8c1: Removed filtering of tokens that don't have a symbol
- Updated dependencies [7338667]
  - @crossmint/client-signers@0.0.20

## 0.12.2

### Patch Changes

- Updated dependencies [d1fa5c0]
  - @crossmint/client-signers@0.0.19

## 0.12.1

### Patch Changes

- f179ab8: Add ability to specify delegate signers for Solana Smart wallets upon creation

## 0.12.0

### Minor Changes

- 96d002e: Exposes the address for different signers that support it

## 0.11.9

### Patch Changes

- 2be90b6: Adds Flow chain
- 3da3b1c: Update balance api types to support name
- Updated dependencies [2be90b6]
  - @crossmint/common-sdk-base@0.9.4

## 0.11.8

### Patch Changes

- 6546b1b: Add plugins to stellar smart wallets

## 0.11.7

### Patch Changes

- 9a1bc3b: Fix fetch balance for Solana tokens

## 0.11.6

### Patch Changes

- bd70d30: Fixes fetching balances in solana

## 0.11.5

### Patch Changes

- 4728def: - Support correct return type based on input for `approve` method.
  - Add a `experimental_prepareOnly` option for `signTypedData` and `signMessage`.

## 0.11.4

### Patch Changes

- Updated dependencies [6960177]
  - @crossmint/common-sdk-base@0.9.3

## 0.11.3

### Patch Changes

- 6559e0c: Makes sure needsAuth is up to date
- 52791f9: patch bumped @solana/web3.js
- Updated dependencies [52791f9]
  - @crossmint/common-sdk-base@0.9.2

## 0.11.2

### Patch Changes

- 74a6281: Stellar SDK support
- Updated dependencies [74a6281]
  - @crossmint/common-sdk-base@0.9.1

## 0.11.1

### Patch Changes

- 2ee5dd6: Add a single approval method and deprecate approveTransaction

## 0.11.0

### Minor Changes

- bb25455: Add support for new blockchain chains including Abstract, ApeChain, Mantle, Scroll, Sei, Curtis, and World Chain variants

### Patch Changes

- bb25455: Adds more chains
- Updated dependencies [bb25455]
- Updated dependencies [bb25455]
  - @crossmint/common-sdk-base@0.9.0

## 0.10.17

### Patch Changes

- da46b20: Improve error when missing onAuthRequired callback
- 2ad2a06: Fix Window Transport Error
- Updated dependencies [2ad2a06]
  - @crossmint/client-sdk-window@1.0.3

## 0.10.16

### Patch Changes

- 5b2b5bf: Updated readme
- c13d001: Expose approveTransaction method

## 0.10.15

### Patch Changes

- 4ea912c: SMS signer
- Updated dependencies [4ea912c]
  - @crossmint/common-sdk-base@0.8.5

## 0.10.14

### Patch Changes

- Updated dependencies [deff029]
- Updated dependencies [220e9c9]
  - @crossmint/client-sdk-window@1.0.2

## 0.10.13

### Patch Changes

- Updated dependencies [99171e9]
- Updated dependencies [689e639]
- Updated dependencies [b573834]
  - @crossmint/client-sdk-window@1.0.1

## 0.10.12

### Patch Changes

- fa12984: Add experimental_transaction method
- Updated dependencies [fa8da3f]
  - @crossmint/common-sdk-base@0.8.4

## 0.10.11

### Patch Changes

- b4fa1ce: fix activity api version
- Updated dependencies [174d730]
  - @crossmint/common-sdk-base@0.8.3

## 0.10.10

### Patch Changes

- 21ed41d: Migrate to 2.5 rest api

## 0.10.9

### Patch Changes

- b791894: Cleanup exports and update readme
- d567616: Exposes WalletsApiClient to easily call any wallets endpoint

## 0.10.8

### Patch Changes

- 61d4d7d: Expose new param options.experimental_prepareOnly on EVM/SOL wallet sendTransaction and send methods
- 6e2ff2e: Add target origin when handshaking with the iframe
- 16a6705: Pass owner prop through wallet instance

## 0.10.7

### Patch Changes

- daaf328: Add EVM signing
- 6a342c4: Move \_handshakeParent from signer to options config and rename to clientTEEConnection
- dabb284: Fix createOnLogin wallet types based on chain
- Updated dependencies [dabb284]
  - @crossmint/common-sdk-base@0.8.2
  - @crossmint/common-sdk-auth@1.0.39

## 0.10.6

### Patch Changes

- 583757c: Add EVM email signer

## 0.10.5

### Patch Changes

- 38abd83: Fixed issue with email not set error even when email is set
- Updated dependencies [38abd83]
- Updated dependencies [ba8495c]
  - @crossmint/common-sdk-base@0.8.1
  - @crossmint/client-signers@0.0.18
  - @crossmint/common-sdk-auth@1.0.38

## 0.10.4

### Patch Changes

- d14b8bc: Fix wallet type

## 0.10.3

### Patch Changes

- 4bd3d5b: Fix balance api

## 0.10.2

### Patch Changes

- e8e84bd: Fix bug with balance api

## 0.10.1

### Patch Changes

- ffb2d11: Update balance api
- ac903cd: Return explorer link with tx
- 934aed9: Renamed unstable api prefix to experimental
- b5c13a7: Cleanup logging
- f1653dd: fix surfacing of api error messages
- fe10244: Production and staging signer urls
- Updated dependencies [fe10244]
  - @crossmint/client-signers@0.0.17

## 0.10.0

### Minor Changes

- 9481d6c: Update wallet SDK integration with consolidated provider architecture

### Patch Changes

- Updated dependencies [9481d6c]
  - @crossmint/common-sdk-base@0.8.0
  - @crossmint/common-sdk-auth@1.0.37

## 0.9.6

### Patch Changes

- Updated dependencies [d924fda]
  - @crossmint/common-sdk-base@0.7.2
  - @crossmint/common-sdk-auth@1.0.36

## 0.9.5

### Patch Changes

- 030c56e: Fix bug with signer object comparison

## 0.9.4

### Patch Changes

- 34d723f: Fixes send api error message and uses latest crossmint.customAuth
- Updated dependencies [34d723f]
  - @crossmint/common-sdk-base@0.7.1
  - @crossmint/common-sdk-auth@1.0.35

## 0.9.3

### Patch Changes

- bc85816: Fix bug with passkey signer validation

## 0.9.2

### Patch Changes

- ec09eb6: Migrate to new balance api
- 39b73aa: sanitize wallet class using es2022 prefix
- bf146b1: Added new experimental method for getting wallet activity
- f49fba5: added getDelegatedSigner and delegatedSigners method

## 0.9.1

### Patch Changes

- f46d3d7: Uses crossmint.user.email for email signer and refactors signer. Adds validation for wallet config
- fc6ed7c: Signer is no longer an optional field
- Updated dependencies [f46d3d7]
  - @crossmint/common-sdk-base@0.7.0
  - @crossmint/common-sdk-auth@1.0.34

## 0.9.0

### Minor Changes

- d081ac9: Release wallets SDK version 2.5 with improved performance and simplified API

### Patch Changes

- Updated dependencies [d081ac9]
  - @crossmint/common-sdk-base@0.6.0
  - @crossmint/common-sdk-auth@1.0.33

## 0.8.1

### Patch Changes

- Updated dependencies [8e4d900]
  - @crossmint/common-sdk-base@0.5.1
  - @crossmint/common-sdk-auth@1.0.32

## 0.8.0

### Minor Changes

- e597884: Remove support for Cardano

### Patch Changes

- Updated dependencies [e597884]
  - @crossmint/common-sdk-base@0.5.0
  - @crossmint/common-sdk-auth@1.0.31

## 0.7.7

### Patch Changes

- Updated dependencies [edc4198]
  - @crossmint/common-sdk-base@0.4.2
  - @crossmint/common-sdk-auth@1.0.30

## 0.7.6

### Patch Changes

- 150a68a: Adds Shape for EVM Smart Wallets
- Updated dependencies [150a68a]
  - @crossmint/common-sdk-base@0.4.1
  - @crossmint/common-sdk-auth@1.0.29

## 0.7.5

### Patch Changes

- @crossmint/common-sdk-auth@1.0.28

## 0.7.4

### Patch Changes

- Updated dependencies [27ed2c2]
  - @crossmint/common-sdk-auth@1.0.27

## 0.7.3

### Patch Changes

- @crossmint/common-sdk-auth@1.0.26

## 0.7.2

### Patch Changes

- Updated dependencies [1c71b43]
  - @crossmint/common-sdk-auth@1.0.25

## 0.7.1

### Patch Changes

- dd64400: Expose new function isValidEVMChain

## 0.7.0

### Minor Changes

- 487d336: Added delegated signer methods for evm smart wallets

## 0.6.0

### Minor Changes

- 8cb19bf: - Removed viem object from being extended from EVMSmartWallet.
  - Added getViemClient to EVMSmartWallet.
  - Removed "chain" from constructor and into respective methods.

## 0.5.3

### Patch Changes

- f729711: Fix get delegate signers and get balances types and error handling

## 0.5.2

### Patch Changes

- d177723: Fix issue when signing with backpack for solana smart wallets transactions

## 0.5.1

### Patch Changes

- 58b967e: Simplifies setup no longer needing appId as it's in the crossmint instance

## 0.5.0

### Minor Changes

- fcf3c21: Fixed wallet return type and renamed properties and methods.

### Patch Changes

- Updated dependencies [89deaad]
  - @crossmint/common-sdk-base@0.4.0
  - @crossmint/common-sdk-auth@1.0.24

## 0.4.4

### Patch Changes

- 30841fa: fix signing for solana transactions

## 0.4.3

### Patch Changes

- 0175422: Allow passing appId

## 0.4.2

### Patch Changes

- @crossmint/common-sdk-auth@1.0.23

## 0.4.1

### Patch Changes

- Updated dependencies [952630a]
  - @crossmint/common-sdk-base@0.3.4
  - @crossmint/common-sdk-auth@1.0.22

## 0.4.0

### Minor Changes

- 4702bda: - removes removeDelegatedSigner
  - API response error handling
  - type-safe errors

### Patch Changes

- Updated dependencies [4702bda]
  - @crossmint/common-sdk-base@0.3.3
  - @crossmint/common-sdk-auth@1.0.21

## 0.3.2

### Patch Changes

- @crossmint/common-sdk-auth@1.0.20

## 0.3.1

### Patch Changes

- 1419305: fixes /balances request

## 0.3.0

### Minor Changes

- f062aee: - renames CrossmintWallet → CrossmintWallets
  - removes EVMMPCWallet definition

## 0.2.2

### Patch Changes

- ca39114: fixed codegen script

## 0.2.1

### Patch Changes

- 9c71ce8: general bug fixes

## 0.2.0

### Minor Changes

- fc7e408: - Adds `getWallet` function to retrieve existing (server) wallets
  - Automatically creates a passkey credential when creating a new EVM smart wallet
  - Adds optional `options` param to define wallet action callbacks
  - Adds optional callbacks for signing and creating passkeys, enabling use outside browsers

### Patch Changes

- 49983da: Fix endpoint for getNfts method
- 063ae65: Upgrade dynamic to v4
- 115ef06: Exposed a handful of types
  - @crossmint/common-sdk-auth@1.0.19

## 0.1.0

### Minor Changes

- bdb8fa5: Initial release
