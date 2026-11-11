import type { Options } from "tsup";

import { treeShakableConfig } from "../../../tsup.config.base";

const config: Options = {
    ...treeShakableConfig,
    // @noble/ed25519 is ESM-only; inline it so the CommonJS build can still be required on older Node versions.
    noExternal: ["@noble/ed25519"],
    esbuildOptions(options) {
        // @noble/ed25519 uses BigInt literals and `**` on BigInts. The ES2015 target would reject the former and
        // rewrite the latter to Math.pow, which throws on BigInt.
        options.supported = { ...options.supported, bigint: true, "exponent-operator": true };
    },
};

export default config;
