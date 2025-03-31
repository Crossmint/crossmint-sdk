import type { Options } from "tsup";

import { treeShakableConfig } from "../../../../tsup.config.base";

const config: Options = {
    ...treeShakableConfig,
    external: ["react", "react-native"],
};

export default config;
