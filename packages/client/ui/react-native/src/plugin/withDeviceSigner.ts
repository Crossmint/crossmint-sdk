import { type ConfigPlugin, withDangerousMod } from "expo/config-plugins";
import path from "path";
import fs from "fs";
import {
    LEGACY_PODFILE_INJECTION,
    LEGACY_PREBUILT_FIX_MARKER,
    PREVIOUS_PODFILE_INJECTION,
} from "./legacyPodfileInjection";

// Removes the Podfile workarounds that earlier versions of this plugin wrote for the
// CrossmintDeviceSigner pod. The device signer now comes from Swift Package Manager, so an app
// that upgrades without `expo prebuild --clean` does not keep lines for a pod it no longer has.
export const withDeviceSigner: ConfigPlugin = (config) => {
    return withDangerousMod(config, [
        "ios",
        async (config) => {
            const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
            const podfile = fs
                .readFileSync(podfilePath, "utf8")
                .split("\n")
                .filter((line) => !line.includes(LEGACY_PREBUILT_FIX_MARKER))
                .join("\n")
                .replace(LEGACY_PODFILE_INJECTION, "")
                .replace(`\n${PREVIOUS_PODFILE_INJECTION}`, "");

            fs.writeFileSync(podfilePath, podfile);
            return config;
        },
    ]);
};
