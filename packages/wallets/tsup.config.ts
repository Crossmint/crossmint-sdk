import { treeShakableConfig } from "../../tsup.config.base";
import type { Options } from "tsup";

const config: Options = {
    ...treeShakableConfig,
};

export default config;
