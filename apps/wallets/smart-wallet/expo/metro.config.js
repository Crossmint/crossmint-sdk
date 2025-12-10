const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Monorepo root
const monorepoRoot = path.resolve(__dirname, "../../../..");

// React paths - force all React imports to use the same instance (react@19.1.1)
const reactPath = path.resolve(monorepoRoot, "node_modules/.pnpm/react@19.1.1/node_modules/react");
const reactDomPath = path.resolve(
    monorepoRoot,
    "node_modules/.pnpm/react-dom@19.1.1_react@19.1.1/node_modules/react-dom"
);

module.exports = {
    ...config,
    // Watch the monorepo root for workspace packages
    watchFolders: [monorepoRoot],
    resolver: {
        ...config.resolver,
        // Block list to prevent Metro from resolving react@19.1.2
        blockList: [/node_modules\/\.pnpm\/react@19\.1\.2\/.*/, /node_modules\/\.pnpm\/react-dom@19\.1\.2.*/],
        extraNodeModules: {
            ...config.resolver.extraNodeModules,
            // see https://docs.solanamobile.com/react-native/polyfill-guides/spl-token
            crypto: require.resolve("react-native-get-random-values"),
            buffer: require.resolve("buffer"),
            stream: require.resolve("stream-browserify"),
            // Force React to resolve from a single location (react@19.1.1)
            react: reactPath,
            "react-dom": reactDomPath,
        },
    },
};
