import fs from "fs";
import path from "path";
import semver from "semver";
import { describe, expect, test } from "vitest";

// The one Expo SDK line this package supports. npm and pnpm install a missing peer at the newest
// version in its range, so a range that spans several SDKs installs modules from the wrong SDK.
const SUPPORTED_EXPO_SDK = "sdk-57";
// An SDK the peer ranges must reject, so the ranges cannot widen back by accident.
const UNSUPPORTED_EXPO_SDK = "sdk-54";

const FIXTURES_DIR = path.resolve(__dirname, "../test/fixtures/bundled-native-modules");
const RN_UI_DIR = path.resolve(__dirname, "..");
const RN_WINDOW_DIR = path.resolve(__dirname, "../../../rn-window");

// Native modules must be peers: a second copy in node_modules breaks autolinking.
const RN_UI_NATIVE_PEERS = [
    "expo",
    "expo-constants",
    "expo-device",
    "expo-secure-store",
    "expo-web-browser",
    "react-native-get-random-values",
    "react-native-svg",
    "react-native-webview",
];
const RN_WINDOW_NATIVE_PEERS = ["react-native-get-random-values", "react-native-webview"];
// Expo packages use the SDK number as their major version from SDK 55.
const isSdkVersioned = (name: string) => name === "expo" || name.startsWith("expo-");

function readJson(file: string): Record<string, any> {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

function bundledVersion(sdk: string, name: string): string {
    const bundled: Record<string, string | null> = readJson(path.join(FIXTURES_DIR, `${sdk}.json`));
    const range = bundled[name];
    if (range == null) {
        throw new Error(`${name} is not in the ${sdk} bundled native modules fixture`);
    }
    return semver.minVersion(range)?.version ?? range;
}

describe.each([
    { name: "@crossmint/client-sdk-react-native-ui", dir: RN_UI_DIR, nativePeers: RN_UI_NATIVE_PEERS },
    { name: "@crossmint/client-sdk-rn-window", dir: RN_WINDOW_DIR, nativePeers: RN_WINDOW_NATIVE_PEERS },
])("$name peer dependencies", ({ dir, nativePeers }) => {
    const pkg = readJson(path.join(dir, "package.json"));
    const peers: Record<string, string> = pkg.peerDependencies ?? {};

    // The `expo` package supplies these, matched to the app's SDK. Declaring them makes npm
    // auto-install the latest version beside Expo's own copy.
    test("leave expo-modules-core and @expo/config-plugins to the expo package", () => {
        const declared = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(peers)];

        expect(declared.filter((name) => ["expo-modules-core", "@expo/config-plugins"].includes(name))).toEqual([]);
    });

    test.each(nativePeers)("declare %s as a peer, not a dependency", (name) => {
        expect(peers[name], `${name} must be a peer dependency`).toBeDefined();
        expect(pkg.dependencies?.[name], `${name} must not be a dependency`).toBeUndefined();
    });

    test.each(nativePeers)(`accept the Expo ${SUPPORTED_EXPO_SDK} version of %s`, (name) => {
        const version = bundledVersion(SUPPORTED_EXPO_SDK, name);

        expect(semver.satisfies(version, peers[name]), `${name}@${version} vs "${peers[name]}"`).toBe(true);
    });

    test.each(nativePeers.filter(isSdkVersioned))(`reject the Expo ${UNSUPPORTED_EXPO_SDK} version of %s`, (name) => {
        const version = bundledVersion(UNSUPPORTED_EXPO_SDK, name);

        expect(semver.satisfies(version, peers[name]), `${name}@${version} vs "${peers[name]}"`).toBe(false);
    });
});
