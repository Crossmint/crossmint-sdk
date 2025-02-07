# @crossmint/common-sdk-base

## 0.3.2

### Patch Changes

- 940add8: Adding chiliz

## 0.3.1

### Patch Changes

- e267c9f: chore: remove source maps

## 0.3.0

### Minor Changes

- 8f738d0: Removes refreshToken from Crossmint

## 0.2.0

### Minor Changes

- 584cd20: Adds queueTask util to run tasks at a specific time

## 0.1.4

### Patch Changes

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

- 456daec: ## @crossmint/common-sdk-base

  - added helper fn for api key validation and getting base url

  ## @crossmint/client-sdk-base

  - removed helper fn for api key validation and getting base url

  ## @crossmint/client-sdk-vanilla-ui

  - bumped LIB_VERSION from 1.1.13 to 1.1.15

## 0.1.3

### Patch Changes

- 3865983: Add `appearance` prop to improve UI customization:

  - `@crossmint/common-sdk-base`: Added two fields to `UIConfigColors`: inputBackground and buttonBackground
  - `@crossmint/client-sdk-auth-core`: Implement `appearance` prop functionality
  - `@crossmint/client-sdk-react-ui`: Integrate `appearance` prop for UI components

  This change allows for better customization of the UI across all packages that depend on these modules.

## 0.1.2

### Patch Changes

- 8f56ddf: Make getEnvironmentForKey public

## 0.1.1

### Patch Changes

- 12b5eac: internal improvements

## 0.1.0

### Minor Changes

- a9b57fa: Release with added API client classes
