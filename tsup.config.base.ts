import type { Options } from "tsup";

export const treeShakableConfig: Options = {
    splitting: true,
    clean: true,
    dts: true,
    format: ["esm", "cjs"],
    bundle: true,
    skipNodeModulesBundle: true,
    watch: false,
    outDir: "dist",
    entry: ["src/**/*.(ts|tsx)", "!src/**/*.test.(ts|tsx)"],
    shims: true,
    minify: process.env.NODE_ENV === "production",
    sourcemap: true,
};
