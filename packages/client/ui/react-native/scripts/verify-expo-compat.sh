#!/usr/bin/env bash
# Checks that the local build of @crossmint/client-sdk-react-native-ui installs, bundles and
# compiles in a clean Expo app of a given SDK, the way a customer app uses it.
#
# Usage: scripts/verify-expo-compat.sh <expo-sdk-major> [ios|android|all] [work-dir]
#   e.g. DEVELOPER_DIR=/Applications/Xcode-26.6.0.app/Contents/Developer scripts/verify-expo-compat.sh 57 ios
#
# Steps:
#   1. Build and `pnpm pack` this package and its workspace dependencies.
#   2. Create a blank Expo app for the SDK, and point every @crossmint package at the tarballs.
#   3. `npx expo install` the peer dependencies, so Expo picks the versions for that SDK.
#   4. Bundle the JS with `expo export`, then `expo prebuild` and compile for the chosen platforms.
set -euo pipefail
# CocoaPods fails with an encoding error without a UTF-8 locale.
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
# Use the xcrun shims in /usr/bin, so `clang` is the selected Xcode's (DEVELOPER_DIR) even when a
# toolchain manager such as swiftenv puts its own clang first. From Expo SDK 56, `pod install`
# compiles a stub library, and a non-Xcode clang fails with "ld: library 'System' not found".
export PATH="/usr/bin:$PATH"

SDK="${1:?Usage: verify-expo-compat.sh <expo-sdk-major> [ios|android|all] [work-dir]}"
PLATFORM="${2:-all}"
WORK_DIR="${3:-$(mktemp -d "${TMPDIR:-/tmp}/crossmint-expo-compat-sdk${SDK}.XXXXXX")}"

PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$PACKAGE_DIR/../../../.." && pwd)"
PACKAGE_NAME="@crossmint/client-sdk-react-native-ui"
APP_NAME="compat"
APP_DIR="$WORK_DIR/$APP_NAME"
TARBALL_DIR="$WORK_DIR/tarballs"
PEERS=(expo-constants expo-device expo-secure-store expo-web-browser react-native-get-random-values react-native-svg react-native-webview)

log() { printf '\n\033[1m[verify-expo-compat sdk-%s] %s\033[0m\n' "$SDK" "$*"; }

log "Work dir: $WORK_DIR"
mkdir -p "$TARBALL_DIR"

log "Building and packing $PACKAGE_NAME and its workspace dependencies"
(cd "$REPO_ROOT" && pnpm turbo build --filter="$PACKAGE_NAME...")
(cd "$REPO_ROOT" && pnpm --filter="$PACKAGE_NAME..." exec pnpm pack --pack-destination "$TARBALL_DIR" >/dev/null)

log "Creating a blank Expo SDK $SDK app"
(cd "$WORK_DIR" && npx --yes create-expo-app@latest "$APP_NAME" --template "blank-typescript@sdk-$SDK" --no-install)

log "Pointing @crossmint packages at the local tarballs"
node - "$APP_DIR" "$TARBALL_DIR" "$PACKAGE_NAME" <<'EOF'
const fs = require("fs");
const path = require("path");
const [appDir, tarballDir, packageName] = process.argv.slice(2);
const pkgPath = path.join(appDir, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const overrides = {};
for (const file of fs.readdirSync(tarballDir).filter((f) => f.endsWith(".tgz"))) {
    // crossmint-client-sdk-react-native-ui-1.7.1.tgz -> @crossmint/client-sdk-react-native-ui
    const name = `@crossmint/${file.replace(/^crossmint-/, "").replace(/-\d+\.\d+\.\d+.*\.tgz$/, "")}`;
    overrides[name] = `file:${path.join(tarballDir, file)}`;
}
pkg.overrides = { ...pkg.overrides, ...overrides };
pkg.dependencies = { ...pkg.dependencies, [packageName]: overrides[packageName] };
// The React Native Directory check needs a remote service that fails now and then; this app
// only needs expo-doctor's local checks (duplicate native modules, peer versions, config).
pkg.expo = { ...pkg.expo, doctor: { reactNativeDirectoryCheck: { enabled: false } } };
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const appJsonPath = path.join(appDir, "app.json");
const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
appJson.expo.scheme = "crossmint-compat";
appJson.expo.ios = { ...appJson.expo.ios, bundleIdentifier: "com.crossmint.compat" };
appJson.expo.android = { ...appJson.expo.android, package: "com.crossmint.compat" };
appJson.expo.plugins = [...(appJson.expo.plugins ?? []), packageName];
fs.writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`);

// Render the providers so Metro bundles the SDK, including the native device signer storage.
fs.writeFileSync(
    path.join(appDir, "App.tsx"),
    `import { Text } from "react-native";
import { CrossmintProvider, CrossmintAuthProvider, CrossmintWalletProvider } from "${packageName}";

export default function App() {
    return (
        <CrossmintProvider apiKey="ck_staging_compat">
            <CrossmintAuthProvider>
                <CrossmintWalletProvider>
                    <Text>compat</Text>
                </CrossmintWalletProvider>
            </CrossmintAuthProvider>
        </CrossmintProvider>
    );
}
`
);
EOF

cd "$APP_DIR"
log "Installing dependencies"
npm install --no-audit --no-fund
npx expo install "${PEERS[@]}"

log "Checking the project with expo-doctor"
npx expo-doctor

log "Type-checking the app"
npx tsc --noEmit

log "Bundling the JS for iOS and Android"
npx expo export --platform ios --platform android --output-dir "$WORK_DIR/export" >/dev/null

if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "all" ]]; then
    log "Building for the iOS simulator with $(xcodebuild -version | head -1)"
    npx expo prebuild --platform ios --clean --no-install
    (cd ios && pod install --repo-update)
    xcodebuild \
        -workspace "ios/$APP_NAME.xcworkspace" \
        -scheme "$APP_NAME" \
        -configuration Debug \
        -sdk iphonesimulator \
        -destination "generic/platform=iOS Simulator" \
        -derivedDataPath "$WORK_DIR/DerivedData" \
        CODE_SIGN_IDENTITY=- \
        build | tail -20
fi

if [[ "$PLATFORM" == "android" || "$PLATFORM" == "all" ]]; then
    log "Building the Android debug APK"
    export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
    npx expo prebuild --platform android --clean --no-install
    (cd android && ./gradlew assembleDebug --console=plain | tail -20)
fi

log "PASS: Expo SDK $SDK ($PLATFORM)"
