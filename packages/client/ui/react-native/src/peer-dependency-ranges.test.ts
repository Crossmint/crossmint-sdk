import fs from "fs";
import path from "path";
import semver from "semver";
import { describe, expect, test } from "vitest";

// Contract tests for the peer ranges in package.json. Each native peer must accept the version that
// the supported Expo SDK bundles and reject the version of an older SDK, so that npm's peer
// auto-install cannot pick a module from the wrong SDK.

// The one Expo SDK line this package supports. npm and pnpm install a missing peer at the newest
// version in its range, so a range that spans several SDKs installs modules from the wrong SDK.
const SUPPORTED_EXPO_SDK = "sdk-58";
// An SDK the peer ranges must reject, so the ranges cannot widen back by accident.
const UNSUPPORTED_EXPO_SDK = "sdk-57";

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

// Expo SDK 58 stopped bundling react-native-get-random-values, so `npx expo install` picks its latest
// release. The peer range must accept it.
const UNBUNDLED_LATEST: Record<string, string> = { "react-native-get-random-values": "2.0.0" };

function isBundled(sdk: string, name: string): boolean {
    return readJson(path.join(FIXTURES_DIR, `${sdk}.json`))[name] != null;
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

    test.each(nativePeers.filter((name) => isBundled(SUPPORTED_EXPO_SDK, name)))(
        `accept the Expo ${SUPPORTED_EXPO_SDK} version of %s`,
        (name) => {
            const version = bundledVersion(SUPPORTED_EXPO_SDK, name);

            expect(semver.satisfies(version, peers[name]), `${name}@${version} vs "${peers[name]}"`).toBe(true);
        }
    );

    test.each(nativePeers.filter((name) => !isBundled(SUPPORTED_EXPO_SDK, name)))(
        `accept the latest release of %s, which Expo ${SUPPORTED_EXPO_SDK} does not bundle`,
        (name) => {
            const version = UNBUNDLED_LATEST[name];

            expect(version, `add ${name} to UNBUNDLED_LATEST`).toBeDefined();
            expect(semver.satisfies(version, peers[name]), `${name}@${version} vs "${peers[name]}"`).toBe(true);
        }
    );

    test.each(nativePeers.filter(isSdkVersioned))(`reject the Expo ${UNSUPPORTED_EXPO_SDK} version of %s`, (name) => {
        const version = bundledVersion(UNSUPPORTED_EXPO_SDK, name);

        expect(semver.satisfies(version, peers[name]), `${name}@${version} vs "${peers[name]}"`).toBe(false);
    });
});
