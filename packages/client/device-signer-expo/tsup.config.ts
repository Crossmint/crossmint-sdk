import type { Options } from "tsup";

import { treeShakableConfig } from "../../../tsup.config.base";

const config: Options = {
    ...treeShakableConfig,
    external: ["react", "react-native", "expo-modules-core", "expo-secure-store", "expo-device", "react-native-get-random-values"],
};

export default config;
