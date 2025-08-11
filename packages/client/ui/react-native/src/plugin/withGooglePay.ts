import { type ConfigPlugin, withAndroidManifest, createRunOncePlugin } from "@expo/config-plugins";

const pkg = require("@crossmint/client-sdk-react-native-ui/package.json");

export interface GooglePayPluginProps {
    enableGooglePay?: boolean;
}

const withGooglePayInternal: ConfigPlugin<GooglePayPluginProps> = (config, options: GooglePayPluginProps = {}) => {
    if (!options.enableGooglePay) {
        return config;
    }

    return withAndroidManifest(config, (config) => {
        const androidManifest = config.modResults;
        const mainApplication = androidManifest?.manifest?.application?.[0];

        if (!mainApplication) {
            throw new Error("Unable to find main application in AndroidManifest.xml");
        }

        if (!mainApplication["meta-data"]) {
            mainApplication["meta-data"] = [];
        }

        const googlePayMetaData = {
            $: {
                "android:name": "com.google.android.gms.wallet.api.enabled",
                "android:value": "true",
            },
        };

        const existingMetaData = mainApplication["meta-data"].find(
            (meta: any) => meta.$?.["android:name"] === "com.google.android.gms.wallet.api.enabled"
        );

        if (!existingMetaData) {
            mainApplication["meta-data"].push(googlePayMetaData);
        }

        if (!androidManifest.manifest.queries) {
            androidManifest.manifest.queries = [];
        }

        const googlePayQueries = [
            {
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
                ],
            },
            {
                intent: [
                    {
                        action: [
                            {
                                $: {
                                    "android:name": "org.chromium.intent.action.IS_READY_TO_PAY",
                                },
                            },
                        ],
                    },
                ],
            },
            {
                intent: [
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
            },
        ];

        googlePayQueries.forEach((query) => {
            const actionName = query.intent[0].action[0].$["android:name"];
            const existingQuery = androidManifest.manifest.queries.find(
                (q: any) => q.intent?.[0]?.action?.[0]?.$?.["android:name"] === actionName
            );

            if (!existingQuery) {
                androidManifest.manifest.queries.push(query);
            }
        });

        return config;
    });
};

export default createRunOncePlugin(withGooglePayInternal, pkg.name, pkg.version);
