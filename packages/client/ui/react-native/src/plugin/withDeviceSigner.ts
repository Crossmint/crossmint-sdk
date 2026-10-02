import { type ConfigPlugin, withDangerousMod } from "expo/config-plugins";
import path from "path";
import fs from "fs";
import { LEGACY_PODFILE_INJECTION, LEGACY_PREBUILT_FIX_MARKER } from "./legacyPodfileInjection";

// Applies an iOS Podfile workaround required by @crossmint/client-sdk-react-native-ui's
// embedded native device signer module (CrossmintDeviceSigner): a simulator arch fix.
// Temporary until fixed in CrossmintDeviceSigner's podspec.
export const withDeviceSigner: ConfigPlugin = (config) => {
    return withDangerousMod(config, [
        "ios",
        async (config) => {
            const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
            let podfile = fs.readFileSync(podfilePath, "utf8");

            // Remove what the previous plugin version wrote, if the app did not regenerate its Podfile.
            podfile = podfile
                .split("\n")
                .filter((line) => !line.includes(LEGACY_PREBUILT_FIX_MARKER))
                .join("\n")
                .replace(LEGACY_PODFILE_INJECTION, "");

            // Inject into the existing post_install block.
            // CocoaPods only allows one post_install block; we must inject into it.
            const injectionMarker = "# @crossmint/expo-device-signer: CrossmintDeviceSigner autolinking exclusion";
            if (!podfile.includes(injectionMarker)) {
                const injection = `    ${injectionMarker}
    installer.pods_project.targets.each do |target|
      if target.name == 'CrossmintDeviceSigner'
        target.build_configurations.each do |config|
          config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = ''
        end
      end
    end
`;
                const withInjection = podfile.replace(/(post_install do \|installer\|)/, `$1\n${injection}`);
                if (withInjection === podfile) {
                    throw new Error(
                        "[crossmint/client-sdk-react-native-ui] Could not inject post_install hook: expected 'post_install do |installer|' in Podfile"
                    );
                }
                podfile = withInjection;
            }

            fs.writeFileSync(podfilePath, podfile);
            return config;
        },
    ]);
};
