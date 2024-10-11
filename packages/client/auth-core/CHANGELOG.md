# @crossmint/client-sdk-auth-core

## 1.5.0

### Minor Changes

- 04dd600: Change to versioned controller

## 1.4.1

### Patch Changes

- 2c38b6c: Updates deprecation notice
- 127ccc6: Deprecated in favour of @crossmint/common-sdk-auth

## 1.4.0

### Minor Changes

- 5387811: Add the user profile

## 1.3.0

### Minor Changes

- eece432: Updates /refresh route

## 1.2.0

### Minor Changes

- 584cd20: Adds call to /refresh and handling decoding jwt client side

### Patch Changes

- @crossmint/client-sdk-base@1.2.8

## 1.1.7

### Patch Changes

- Updated dependencies [08177a6]
  - @crossmint/client-sdk-base@1.2.7

## 1.1.6

### Patch Changes

- d8bf3d5: Added style to blur auth modal background
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

## 1.1.5

### Patch Changes

- 3865983: Add `appearance` prop to improve UI customization:

  - `@crossmint/common-sdk-base`: Added two fields to `UIConfigColors`: inputBackground and buttonBackground
  - `@crossmint/client-sdk-auth-core`: Implement `appearance` prop functionality
  - `@crossmint/client-sdk-react-ui`: Integrate `appearance` prop for UI components

  This change allows for better customization of the UI across all packages that depend on these modules.

- Updated dependencies [3865983]
  - @crossmint/common-sdk-base@0.1.3

## 1.1.4

### Patch Changes

- ab9f579: export method to grab jwt

## 1.1.3

### Patch Changes

- c63fafe: Added close icon button to auth modal

## 1.1.2

### Patch Changes

- Updated dependencies [2979be2]
  - @crossmint/client-sdk-window@0.0.10

## 1.1.1

### Patch Changes

- e9060b6: Consolidated exports and improved initial jwt state

## 1.1.0

### Minor Changes

- dc97a9a: Change query parameter

## 1.0.2

### Patch Changes

- Updated dependencies [11a9bb8]
  - @crossmint/client-sdk-window@0.0.9

## 1.0.1

### Patch Changes

- 82e429b: Make the package public

## 1.0.0

### Major Changes

- e892e09: Release the first version of the auth-core SDK

### Patch Changes

- Updated dependencies [dbca75f]
  - @crossmint/client-sdk-window@0.0.8
