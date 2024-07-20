import type { Options } from "tsup";

export const singleEntryNonTreeShakableConfig: Options = {
    clean: true,
    dts: true,
    format: ["esm", "cjs"],
    minify: true,
    bundle: true,
    skipNodeModulesBundle: true,
    watch: false,
    outDir: "dist",
    entry: ["src/index.ts"],
    shims: true,
    sourcemap: true,
};
