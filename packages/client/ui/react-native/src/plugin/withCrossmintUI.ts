import { type ConfigPlugin, createRunOncePlugin } from "@expo/config-plugins";
import { type GooglePayPluginProps, withGooglePay } from "./withGooglePay";
import { withDeviceSigner } from "./withDeviceSigner";

const pkg = require("@crossmint/client-sdk-react-native-ui/package.json");

const withCrossmintUI: ConfigPlugin<GooglePayPluginProps> = (config, options) => {
    config = withDeviceSigner(config);
    config = withGooglePay(config, options);
    return config;
};

export default createRunOncePlugin(withCrossmintUI, pkg.name, pkg.version);
