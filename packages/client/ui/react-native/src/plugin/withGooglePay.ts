import { type ConfigPlugin, withAndroidManifest, createRunOncePlugin, AndroidConfig } from "@expo/config-plugins";
import { addQueryToAndroidManifest } from "./mods/addQueryToAndroidManifest";

const { addMetaDataItemToMainApplication, getMainApplicationOrThrow } = AndroidConfig.Manifest;

const pkg = require("@crossmint/client-sdk-react-native-ui/package.json");

export interface GooglePayPluginProps {
    enableGooglePay?: boolean;
}

const withGooglePay: ConfigPlugin<GooglePayPluginProps> = (
    config,
    options: GooglePayPluginProps = { enableGooglePay: false }
) => {
    if (!options.enableGooglePay) {
        return config;
    }

    return withAndroidManifest(config, (config) => {
        const mainApplication = getMainApplicationOrThrow(config.modResults);

        addMetaDataItemToMainApplication(mainApplication, "com.google.android.gms.wallet.api.enabled", "true");
        config.modResults = addQueryToAndroidManifest(config.modResults, {
            intent: [
                {
                    action: [
                        {
                            $: {
                                "android:name": "org.chromium.intent.action.PAY",
                            },
                        },
                    ],
                },
                {
                    action: [
                        {
                            $: {
                                "android:name": "org.chromium.intent.action.IS_READY_TO_PAY",
                            },
                        },
                    ],
                },
                {
                    action: [
                        {
                            $: {
                                "android:name": "org.chromium.intent.action.UPDATE_PAYMENT_DETAILS",
                            },
                        },
                    ],
                },
            ],
        });

        return config;
    });
};

export default createRunOncePlugin(withGooglePay, pkg.name, pkg.version);
