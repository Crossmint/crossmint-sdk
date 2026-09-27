import fs from "fs";
import path from "path";
import semver from "semver";
import { describe, expect, test } from "vitest";

// Expo SDK versions that customer apps can use with this package.
const SUPPORTED_EXPO_SDKS = ["sdk-54", "sdk-55", "sdk-56", "sdk-57"];

const FIXTURES_DIR = path.resolve(__dirname, "../test/fixtures/bundled-native-modules");
const PACKAGES = [
    { name: "@crossmint/client-sdk-react-native-ui", dir: path.resolve(__dirname, "..") },
    { name: "@crossmint/client-sdk-rn-window", dir: path.resolve(__dirname, "../../../rn-window") },
];

// Native modules must be peers: a second copy in node_modules breaks autolinking.
const NATIVE_MODULES = [
    "expo-constants",
    "expo-device",
    "expo-secure-store",
    "expo-web-browser",
    "react-native-get-random-values",
    "react-native-svg",
    "react-native-webview",
];

function readJson(file: string): Record<string, any> {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

describe.each(PACKAGES)("$name peer dependencies", ({ dir }) => {
    const pkg = readJson(path.join(dir, "package.json"));
    const peers: Record<string, string> = pkg.peerDependencies ?? {};

    // The `expo` package supplies these, matched to the app's SDK. Declaring them makes npm
    // auto-install the latest version beside Expo's own copy.
    test("leave expo-modules-core and @expo/config-plugins to the expo package", () => {
        const declared = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(peers)];

        expect(declared.filter((name) => ["expo-modules-core", "@expo/config-plugins"].includes(name))).toEqual([]);
    });

    test("declare no native module as a direct dependency", () => {
        const direct = Object.keys(pkg.dependencies ?? {});

        expect(direct.filter((name) => NATIVE_MODULES.includes(name))).toEqual([]);
    });

    describe.each(SUPPORTED_EXPO_SDKS)("with the Expo %s bundled versions", (sdk) => {
        const bundled: Record<string, string | null> = readJson(path.join(FIXTURES_DIR, `${sdk}.json`));
        const checked = Object.entries(peers).filter(([name]) => bundled[name] != null);

        test.each(checked)("accept %s", (name, peerRange) => {
            const bundledVersion = semver.minVersion(bundled[name] as string)?.version;

            expect(
                semver.satisfies(bundledVersion ?? "", peerRange),
                `${name}@${bundledVersion} vs "${peerRange}"`
            ).toBe(true);
        });
    });
});
