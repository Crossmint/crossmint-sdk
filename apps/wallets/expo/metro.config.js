const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Monorepo root is three levels up: apps/wallets/expo → repo root
const monorepoRoot = path.resolve(__dirname, "../../..");
const rootNodeModules = path.resolve(monorepoRoot, "node_modules");
const appNodeModules = path.resolve(__dirname, "node_modules");
const packagesDir = path.resolve(monorepoRoot, "packages");

module.exports = {
    ...config,
    watchFolders: [monorepoRoot, packagesDir],
    resolver: {
        ...config.resolver,
        extraNodeModules: {
            ...config.resolver.extraNodeModules,
            crypto: require.resolve("react-native-get-random-values"),
            buffer: require.resolve("buffer"),
            stream: require.resolve("stream-browserify"),
            react: path.resolve(rootNodeModules, "react"),
            "react-native": path.resolve(rootNodeModules, "react-native"),
        },
        nodeModulesPaths: [appNodeModules, rootNodeModules],
        sourceExts: [...config.resolver.sourceExts, "cjs"],
        unstable_enablePackageExports: true,
        unstable_conditionNames: ["require", "import", "default"],
    },
};
