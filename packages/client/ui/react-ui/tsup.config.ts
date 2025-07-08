import type { Options } from "tsup";

import { treeShakableConfig } from "../../../../tsup.config.base";

const config: Options = {
    ...treeShakableConfig,
    external: ["react", "react-dom"],
    noExternal: [/@dynamic-labs\/utils/],
    esbuildOptions(options) {
        options.alias = {
            "@dynamic-labs/utils/src/services/Oauth2Service/utils/loadAppleId/loadAppleId": "./src/shims/noop.ts", // kills the Apple loader
        };
    },
};

export default config;
