import { defineConfig } from "tsup";
import { treeShakableConfig } from "../../../../tsup.config.base";

export default defineConfig({
    ...treeShakableConfig,
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    external: ["react", "react-native"],
    platform: "neutral",
});
