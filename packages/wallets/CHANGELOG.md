# @crossmint/wallets-sdk

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
