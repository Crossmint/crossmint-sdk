import type { Options } from "tsup";

import { treeShakableConfig } from "../../../tsup.config.base";

const config: Options = {
    ...treeShakableConfig,
    external: ["react"],
};

export default config;
