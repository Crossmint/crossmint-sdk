# @crossmint/client-sdk-react-ui

## 1.3.23

### Patch Changes

-   cc901c2: Expose smart wallet signer types

## 1.3.22

### Patch Changes

-   6dc362a: Added Twind, a lightweight css-in-js tailwind compiler
-   Updated dependencies [08177a6]
    -   @crossmint/client-sdk-smart-wallet@0.1.16
    -   @crossmint/client-sdk-base@1.2.7
    -   @crossmint/client-sdk-auth-core@1.1.7

## 1.3.21

### Patch Changes

-   Updated dependencies [df3b150]
    -   @crossmint/client-sdk-smart-wallet@0.1.15

## 1.3.20

### Patch Changes

-   428b8b9: Remove jwt prop from `CrossmintProvider`

## 1.3.19

### Patch Changes

-   ada9c69: Changed auth modal close button default color

## 1.3.18

### Patch Changes

-   16d7d56: Fix hydration error issue
-   bb0d53e: Removes horizontal padding from the AuthModal to avoid clipping iframe.

## 1.3.17

### Patch Changes

-   b2439fb: Update readme to include smart wallet quickstart

## 1.3.16

### Patch Changes

-   77d1846: Export smart wallet errors
-   Updated dependencies [77d1846]
    -   @crossmint/client-sdk-smart-wallet@0.1.14

## 1.3.15

### Patch Changes

-   43806fd: Fixed auth modal string url bug

## 1.3.14

### Patch Changes

-   e5f3904: Responsive modal
-   f80e488: allow auth and wallet providers to use all smart wallet supported chains. Rename smart wallet SDK chain export.
-   30f42da: @crossmint/client-sdk-auth-core:

    -   Removed CrossmintAuthProvider and all React-related functionality

    @crossmint/client-sdk-react-ui:

    -   Added CrossmintAuthProvider

    @crossmint/common-sdk-base:

    -   Added helper function for API key validation
    -   Added helper function for getting base URL

    @crossmint/client-sdk-base:

    -   Removed helper function for API key validation
    -   Removed helper function for getting base URL

-   16c58af: Add option to specify signer in CrossmintWalletProvider and simplify interface.
-   910403e: - **@crossmint/client-sdk-smart-wallet**: Fixed an issue where checking if running on the client was done too early, causing issues with Next.js. Moved the check to a function call instead.
    -   **@crossmint/client-sdk-react-ui**: Updated React version to ^18.3.0.
    -   **@crossmint/client-sdk-auth-core**: Updated React version to ^18.3.0. Fixed a hydration error when rendering the auth modal.
-   Updated dependencies [f80e488]
-   Updated dependencies [d8bf3d5]
-   Updated dependencies [d69cf70]
-   Updated dependencies [30f42da]
-   Updated dependencies [910403e]
-   Updated dependencies [456daec]
    -   @crossmint/client-sdk-smart-wallet@0.1.13
    -   @crossmint/client-sdk-auth-core@1.1.6
    -   @crossmint/client-sdk-base@1.2.6
    -   @crossmint/common-sdk-base@0.1.4

## 1.3.13

### Patch Changes

-   3865983: Add `appearance` prop to improve UI customization:

    -   `@crossmint/common-sdk-base`: Added two fields to `UIConfigColors`: inputBackground and buttonBackground
    -   `@crossmint/client-sdk-auth-core`: Implement `appearance` prop functionality
    -   `@crossmint/client-sdk-react-ui`: Integrate `appearance` prop for UI components

    This change allows for better customization of the UI across all packages that depend on these modules.

-   Updated dependencies [3865983]
    -   @crossmint/client-sdk-auth-core@1.1.5
    -   @crossmint/common-sdk-base@0.1.3
    -   @crossmint/client-sdk-base@1.2.5
    -   @crossmint/client-sdk-smart-wallet@0.1.12

## 1.3.12

### Patch Changes

-   Updated dependencies [f8f0c66]
    -   @crossmint/client-sdk-base@1.2.4
    -   @crossmint/client-sdk-smart-wallet@0.1.11

## 1.3.11

### Patch Changes

-   36204ce: fix error handling issue
-   Updated dependencies [4c5d88b]
    -   @crossmint/client-sdk-smart-wallet@0.1.10

## 1.3.10

### Patch Changes

-   Updated dependencies [ab9f579]
    -   @crossmint/client-sdk-auth-core@1.1.4

## 1.3.9

### Patch Changes

-   171924e: Add CrossmintWalletProvider and improve speed
-   Updated dependencies [171924e]
    -   @crossmint/client-sdk-smart-wallet@0.1.9

## 1.3.8

### Patch Changes

-   Updated dependencies [c63fafe]
    -   @crossmint/client-sdk-auth-core@1.1.3

## 1.3.7

### Patch Changes

-   Updated dependencies [a124584]
    -   @crossmint/client-sdk-smart-wallet@0.1.8

## 1.3.6

### Patch Changes

-   @crossmint/client-sdk-auth-core@1.1.2

## 1.3.5

### Patch Changes

-   Updated dependencies [691f8f8]
    -   @crossmint/client-sdk-smart-wallet@0.1.7

## 1.3.4

### Patch Changes

-   Updated dependencies [8f56ddf]
    -   @crossmint/common-sdk-base@0.1.2
    -   @crossmint/client-sdk-base@1.2.3
    -   @crossmint/client-sdk-smart-wallet@0.1.6

## 1.3.3

### Patch Changes

-   Updated dependencies [443372b]
    -   @crossmint/client-sdk-smart-wallet@0.1.5

## 1.3.2

### Patch Changes

-   5c60365: Export EVMSmartWallet & Chain types

## 1.3.1

### Patch Changes

-   Updated dependencies [12b5eac]
    -   @crossmint/client-sdk-base@1.2.2
    -   @crossmint/common-sdk-base@0.1.1
    -   @crossmint/client-sdk-smart-wallet@0.1.4

## 1.3.0

### Minor Changes

-   71b3778: Added Crossmint auth provider

### Patch Changes

-   Updated dependencies [e9060b6]
-   Updated dependencies [7bdb67f]
    -   @crossmint/client-sdk-auth-core@1.1.1
    -   @crossmint/client-sdk-smart-wallet@0.1.3

## 1.2.2

### Patch Changes

-   Updated dependencies [a9b57fa]
    -   @crossmint/common-sdk-base@0.1.0
    -   @crossmint/client-sdk-base@1.2.1

## 1.2.1

### Patch Changes

-   65bcbee: embed: fiat fix live updating params

## 1.2.0

### Minor Changes

-   c5f8027: Bump @solana/web3.js

### Patch Changes

-   Updated dependencies [c5f8027]
    -   @crossmint/client-sdk-base@1.2.0

## 1.1.11

### Patch Changes

-   655f990: bump
-   Updated dependencies [655f990]
    -   @crossmint/client-sdk-base@1.1.14
