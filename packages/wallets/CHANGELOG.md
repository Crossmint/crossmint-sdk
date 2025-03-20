# @crossmint/wallets-sdk

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
