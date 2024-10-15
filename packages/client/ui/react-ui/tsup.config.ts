import type { Options } from "tsup";

import { treeShakableConfig } from "../../../../tsup.config.base";

const config: Options = {
    ...treeShakableConfig,
    external: ["react", "react-dom"],
    entry: ["src/index.ts"],
};

export default config;
