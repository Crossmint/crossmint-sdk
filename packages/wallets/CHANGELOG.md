# @crossmint/wallets-sdk

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
