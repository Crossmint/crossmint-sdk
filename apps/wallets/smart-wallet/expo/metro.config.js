const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

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
        nodeModulesPaths: [path.resolve(monorepoRoot, "node_modules")],
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
        // @hpke/* packages ship UMD files as their CJS entry point. The UMD wrapper
        // function(require, exports){} shadows Metro's require, so Metro can't statically
        // detect @hpke/common as a dependency of @hpke/core. Additionally pnpm's multi-level
        // symlinks inside the virtual store break Metro's module resolution.
        // Fix: resolve all @hpke/* to their ESM entry (esm/mod.js), which uses static
        // export ... from "..." syntax that Metro CAN analyze, from the real (non-symlink) path.
        resolveRequest: (context, moduleName, platform) => {
            if (moduleName.startsWith("@hpke/")) {
                try {
                    const pkgDir = fs.realpathSync(path.resolve(monorepoRoot, "node_modules", moduleName));
                    const esmPath = path.join(pkgDir, "esm/mod.js");
                    if (fs.existsSync(esmPath)) {
                        return { filePath: esmPath, type: "sourceFile" };
                    }
                    // Fallback to main (should not happen for @hpke/*)
                    const resolved = require.resolve(moduleName, { paths: [monorepoRoot] });
                    return { filePath: fs.realpathSync(resolved), type: "sourceFile" };
                } catch (_) {
                    // fall through to default resolution
                }
            }
            return context.resolveRequest(context, moduleName, platform);
        },
    },
};
