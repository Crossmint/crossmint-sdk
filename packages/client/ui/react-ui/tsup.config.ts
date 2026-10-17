import { resolve } from "node:path";
import type { Options } from "tsup";

import { treeShakableConfig } from "../../../../tsup.config.base";
import { createCheckoutExternalsPlugin } from "./build/checkout-externals";
import { thirdPartyNoticesPlugin } from "./build/third-party-notices";
import { validateCommonJs } from "./build/validate-commonjs";
import packageJson from "./package.json";

const config: Options = {
    ...treeShakableConfig,
    platform: "browser",
    target: "es2020",
    skipNodeModulesBundle: false,
    noExternal: [/.*/],
    onSuccess: () => validateCommonJs(resolve(__dirname, "dist")),
    esbuildPlugins: [
        createCheckoutExternalsPlugin({
            sourceRoot: resolve(__dirname, "src"),
            runtimeDependencies: Object.keys(packageJson.dependencies),
        }),
        thirdPartyNoticesPlugin(resolve(__dirname, "dist")),
    ],
    esbuildOptions(options, { format }) {
        // tsup's CJS splitting transform cannot lower these inside async generators safely.
        options.supported = {
            ...options.supported,
            "nullish-coalescing": false,
            "optional-chain": false,
        };
        if (format === "cjs") {
            options.define = { ...options.define, "import.meta.env": "undefined" };
        }
        options.alias = {
            "bigint-buffer": resolve(__dirname, "build/solana-bigint.ts"),
            "@dynamic-labs/utils/src/services/Oauth2Service/utils/loadAppleId/loadAppleId": "./src/shims/noop.ts", // kills the Apple loader
        };
    },
};

export default config;
