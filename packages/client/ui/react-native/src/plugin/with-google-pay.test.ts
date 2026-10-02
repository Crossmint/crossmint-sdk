import path from "path";
import { AndroidConfig, XML } from "expo/config-plugins";
import { beforeEach, describe, expect, test } from "vitest";

import { withGooglePay } from "./withGooglePay";

type AndroidManifest = AndroidConfig.Manifest.AndroidManifest;

const FIXTURES_DIR = path.resolve(__dirname, "../../test/fixtures");
const SDK_VERSIONS = ["sdk-57"];
const PAYMENT_ACTIONS = [
    "org.chromium.intent.action.PAY",
    "org.chromium.intent.action.IS_READY_TO_PAY",
    "org.chromium.intent.action.UPDATE_PAYMENT_DETAILS",
];

// Runs the plugin's android.manifest mod against a parsed manifest, the way `expo prebuild` does.
async function runManifestMod(
    manifest: AndroidManifest,
    options?: Parameters<typeof withGooglePay>[1]
): Promise<AndroidManifest> {
    const config = withGooglePay({ name: "test", slug: "test" }, options);
    const mod = config.mods?.android?.manifest;
    if (mod == null) {
        return manifest;
    }
    const result = await mod({ ...config, modResults: manifest, modRequest: {} } as never);
    return (result as { modResults: AndroidManifest }).modResults;
}

function paymentQueryActions(manifest: AndroidManifest): string[] {
    return (manifest.manifest.queries ?? []).flatMap((query) =>
        (query.intent ?? []).flatMap((intent) => (intent.action ?? []).map((action) => action.$["android:name"]))
    );
}

describe("withGooglePay", () => {
    describe.each(SDK_VERSIONS)("with the Expo %s AndroidManifest template", (sdk) => {
        let templateManifest: AndroidManifest;

        beforeEach(async () => {
            templateManifest = await AndroidConfig.Manifest.readAndroidManifestAsync(
                path.join(FIXTURES_DIR, sdk, "AndroidManifest.xml")
            );
        });

        describe("when Google Pay is disabled", () => {
            test("registers no manifest mod", () => {
                const config = withGooglePay({ name: "test", slug: "test" }, { enableGooglePay: false });

                expect(config.mods?.android?.manifest).toBeUndefined();
            });
        });

        describe("when Google Pay is enabled", () => {
            test("enables the wallet API in the main application", async () => {
                const manifest = await runManifestMod(templateManifest, { enableGooglePay: true });
                const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

                expect(mainApplication["meta-data"]).toContainEqual({
                    $: { "android:name": "com.google.android.gms.wallet.api.enabled", "android:value": "true" },
                });
            });

            test("adds the payment intent queries", async () => {
                const manifest = await runManifestMod(templateManifest, { enableGooglePay: true });

                expect(paymentQueryActions(manifest)).toEqual(expect.arrayContaining(PAYMENT_ACTIONS));
            });

            test("matches the snapshot", async () => {
                const manifest = await runManifestMod(templateManifest, { enableGooglePay: true });

                expect(XML.format(manifest)).toMatchSnapshot();
            });
        });
    });
});
