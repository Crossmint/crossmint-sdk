// Checks that the playground and @crossmint/client-sdk-react-native-ui resolve the same copy of
// each native module in this monorepo.
//
// Metro resolves the SDK's imports from the SDK's own node_modules first. If pnpm gives the
// playground and the SDK different peer variants of a native module, the app bundles two copies.
// The playground's `encoding` devDependency exists for this reason: without it, pnpm resolves
// react-native-web, and so expo and every expo-* module, in a second variant for the SDK.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PLAYGROUND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = path.resolve(PLAYGROUND_DIR, "../../..");
const SDK_DIR = path.join(REPO_ROOT, "packages/client/ui/react-native");

const NATIVE_MODULES = [
    "expo",
    "expo-constants",
    "expo-device",
    "expo-secure-store",
    "expo-web-browser",
    "react-native-get-random-values",
    "react-native-svg",
    "react-native-webview",
];

function resolvedCopy(fromDirs, name) {
    for (const dir of fromDirs) {
        const candidate = path.join(dir, "node_modules", name);
        if (fs.existsSync(candidate)) {
            return fs.realpathSync(candidate);
        }
    }
    return null;
}

const mismatches = NATIVE_MODULES.flatMap((name) => {
    const sdkCopy = resolvedCopy([SDK_DIR], name);
    const playgroundCopy = resolvedCopy([PLAYGROUND_DIR, REPO_ROOT], name);
    return sdkCopy !== null && sdkCopy === playgroundCopy ? [] : [{ name, sdkCopy, playgroundCopy }];
});

if (mismatches.length > 0) {
    console.error("The playground and the React Native SDK do not share one installed copy of:");
    for (const { name, sdkCopy, playgroundCopy } of mismatches) {
        console.error(`  ${name}\n    SDK:        ${sdkCopy ?? "not installed"}\n    playground: ${playgroundCopy ?? "not installed"}`);
    }
    process.exit(1);
}
console.log(`The playground and the React Native SDK share one copy of ${NATIVE_MODULES.length} native modules.`);
