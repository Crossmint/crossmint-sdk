import { type ConfigPlugin, createRunOncePlugin } from "@expo/config-plugins";

import withGooglePay, { type GooglePayPluginProps } from "./withGooglePay";

const pkg = require("@crossmint/client-sdk-react-native-ui/package.json");

export interface CrossmintPluginProps extends GooglePayPluginProps {}

const withCrossmint: ConfigPlugin<CrossmintPluginProps> = (config, options = {}) => {
    config = withGooglePay(config, { enableGooglePay: options.enableGooglePay });

    // Conditionally apply device signer plugin if @crossmint/expo-device-signer is installed.
    try {
        const withDeviceSigner = require("@crossmint/expo-device-signer/app.plugin");
        config = withDeviceSigner(config);
    } catch {
        // Not installed — device signing unavailable.
    }

    return config;
};

export default createRunOncePlugin(withCrossmint, pkg.name, pkg.version);
