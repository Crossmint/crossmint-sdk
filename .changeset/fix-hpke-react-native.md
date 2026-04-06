---
"@crossmint/client-signers-cryptography": patch
---

Bundle @hpke/core and @hpke/common into the package output to fix React Native / Expo compatibility. The @hpke/* CJS entry points use a UMD wrapper that shadows Metro's require, preventing it from resolving @hpke/common as a transitive dependency. By inlining these packages at build time, consumers no longer need metro.config.js workarounds.
