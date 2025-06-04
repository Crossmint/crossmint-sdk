# @crossmint/wallets-sdk

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
