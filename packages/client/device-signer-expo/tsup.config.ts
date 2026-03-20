import type { Options } from "tsup";

import { treeShakableConfig } from "../../../tsup.config.base";

const config: Options = {
    ...treeShakableConfig,
    external: ["react", "react-native", "expo-modules-core", "expo-secure-store", "expo-device"],
};

export default config;
