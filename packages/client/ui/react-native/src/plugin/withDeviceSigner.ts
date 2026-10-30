import { type ConfigPlugin, withDangerousMod } from "expo/config-plugins";
import path from "path";
import fs from "fs";
import { LEGACY_PODFILE_INJECTION, LEGACY_PREBUILT_FIX_MARKER } from "./legacyPodfileInjection";

// Removes the Podfile workarounds that versions of this plugin up to 1.7.x wrote, if the app did
// not regenerate its Podfile.
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
                .replace(LEGACY_PODFILE_INJECTION, "");

            fs.writeFileSync(podfilePath, podfile);
            return config;
        },
    ]);
};
