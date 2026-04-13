# @crossmint/client-signers-cryptography

## 0.0.5

### Patch Changes

- 80538a9: Bundle @hpke/core and @hpke/common into the package output to fix React Native / Expo compatibility. The @hpke/\* CJS entry points use a UMD wrapper that shadows Metro's require, preventing it from resolving @hpke/common as a transitive dependency. By inlining these packages at build time, consumers no longer need metro.config.js workarounds.

## 0.0.4

### Patch Changes

- 25ad566: Updates dependencies

## 0.0.3

### Patch Changes

- 978420c: Updates React to patched version
- 7c47c14: Update @hpke/core to fix critical security vulnerability related to AEAD nonce reuse

## 0.0.2

### Patch Changes

- b7aa8d6: Create package
