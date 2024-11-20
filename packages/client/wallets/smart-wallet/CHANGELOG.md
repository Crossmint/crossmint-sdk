# @crossmint/client-sdk-smart-wallet

## 0.1.23

### Patch Changes

- Updated dependencies [6ab0ac1]
  - @crossmint/client-sdk-base@1.3.3

## 0.1.22

### Patch Changes

- Updated dependencies [e30569f]
- Updated dependencies [ea8ce4d]
- Updated dependencies [8f738d0]
  - @crossmint/client-sdk-base@1.3.2
  - @crossmint/common-sdk-base@0.3.0

## 0.1.21

### Patch Changes

- Updated dependencies [2c7561c]
  - @crossmint/client-sdk-base@1.3.1

## 0.1.20

### Patch Changes

- Updated dependencies [88a801d]
  - @crossmint/client-sdk-base@1.3.0

## 0.1.19

### Patch Changes

- eff943c: Added wallet passkey prompts

## 0.1.18

### Patch Changes

- Updated dependencies [584cd20]
  - @crossmint/common-sdk-base@0.2.0
  - @crossmint/client-sdk-base@1.2.8

## 0.1.17

### Patch Changes

- e8a4dec: grab package version dynamically

## 0.1.16

### Patch Changes

- 08177a6: Strip transferToken function
- Updated dependencies [08177a6]
  - @crossmint/client-sdk-base@1.2.7

## 0.1.15

### Patch Changes

- df3b150: rename `EOASigner` => `ExternalSigner`

## 0.1.14

### Patch Changes

- 77d1846: Export `executeContract` errors

## 0.1.13

### Patch Changes

- f80e488: allow auth and wallet providers to use all smart wallet supported chains. Rename smart wallet SDK chain export.
- d69cf70: Added chain <> env validation
- 30f42da: @crossmint/client-sdk-auth-core:

  - Removed CrossmintAuthProvider and all React-related functionality

  @crossmint/client-sdk-react-ui:

  - Added CrossmintAuthProvider

  @crossmint/common-sdk-base:

  - Added helper function for API key validation
  - Added helper function for getting base URL

  @crossmint/client-sdk-base:

  - Removed helper function for API key validation
  - Removed helper function for getting base URL

- 910403e: - **@crossmint/client-sdk-smart-wallet**: Fixed an issue where checking if running on the client was done too early, causing issues with Next.js. Moved the check to a function call instead.
  - **@crossmint/client-sdk-react-ui**: Updated React version to ^18.3.0.
  - **@crossmint/client-sdk-auth-core**: Updated React version to ^18.3.0. Fixed a hydration error when rendering the auth modal.
- Updated dependencies [30f42da]
- Updated dependencies [456daec]
  - @crossmint/client-sdk-base@1.2.6
  - @crossmint/common-sdk-base@0.1.4

## 0.1.12

### Patch Changes

- Updated dependencies [3865983]
  - @crossmint/common-sdk-base@0.1.3
  - @crossmint/client-sdk-base@1.2.5

## 0.1.11

### Patch Changes

- Updated dependencies [f8f0c66]
  - @crossmint/client-sdk-base@1.2.4

## 0.1.10

### Patch Changes

- 4c5d88b: Added executeContract method to EVMSmartWallet

## 0.1.9

### Patch Changes

- 171924e: Add CrossmintWalletProvider and improve speed

## 0.1.8

### Patch Changes

- a124584: performance monitoring enhancement

## 0.1.7

### Patch Changes

- 691f8f8: passkey registration fix

## 0.1.6

### Patch Changes

- Updated dependencies [8f56ddf]
  - @crossmint/common-sdk-base@0.1.2
  - @crossmint/client-sdk-base@1.2.3

## 0.1.5

### Patch Changes

- 443372b: Speed improvements

## 0.1.4

### Patch Changes

- Updated dependencies [12b5eac]
  - @crossmint/client-sdk-base@1.2.2
  - @crossmint/common-sdk-base@0.1.1

## 0.1.3

### Patch Changes

- 7bdb67f: Improve errors and logging

## 0.1.2

### Patch Changes

- 12acac2: Updated name for exported chains.
