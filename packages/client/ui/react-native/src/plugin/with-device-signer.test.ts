import fs from "fs";
import os from "os";
import path from "path";
import { beforeEach, describe, expect, test } from "vitest";

import { withDeviceSigner } from "./withDeviceSigner";

const FIXTURES_DIR = path.resolve(__dirname, "../../test/fixtures");
const SDK_VERSIONS = ["sdk-57"];

// Runs the plugin's ios.dangerous mod against a Podfile, the way `expo prebuild` does.
async function runPodfileMod(podfile: string): Promise<string> {
    const platformProjectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "crossmint-podfile-"));
    try {
        const podfilePath = path.join(platformProjectRoot, "Podfile");
        fs.writeFileSync(podfilePath, podfile);
        const config = withDeviceSigner({ name: "test", slug: "test" });
        const mod = config.mods?.ios?.dangerous;
        if (mod == null) {
            throw new Error("withDeviceSigner did not register an ios.dangerous mod");
        }
        await mod({ ...config, modResults: undefined, modRequest: { platformProjectRoot } } as never);
        return fs.readFileSync(podfilePath, "utf8");
    } finally {
        fs.rmSync(platformProjectRoot, { recursive: true, force: true });
    }
}

describe("withDeviceSigner", () => {
    describe.each(SDK_VERSIONS)("with the Expo %s Podfile template", (sdk) => {
        let templatePodfile: string;

        beforeEach(() => {
            templatePodfile = fs.readFileSync(path.join(FIXTURES_DIR, sdk, "Podfile"), "utf8");
        });

        test("injects the CrossmintDeviceSigner hooks into post_install", async () => {
            const podfile = await runPodfileMod(templatePodfile);

            expect(podfile).toContain("# @crossmint/expo-device-signer: CrossmintDeviceSigner autolinking exclusion");
            expect(podfile).toMatch(/post_install do \|installer\|\n {4}# @crossmint\/expo-device-signer/);
            expect(podfile).toContain("if target.name == 'CrossmintDeviceSigner'");
            expect(podfile).toContain("config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = ''");
        });

        test("leaves the prebuilt React Native core settings to Expo", async () => {
            const podfile = await runPodfileMod(templatePodfile);

            expect(podfile).not.toContain("ENV.delete('RCT_USE_RN_DEP')");
            expect(podfile).not.toContain("ENV.delete('RCT_USE_PREBUILT_RNCORE')");
            expect(podfile).not.toContain("GCC_PREFIX_HEADER");
        });

        test("keeps a single post_install block", async () => {
            const podfile = await runPodfileMod(templatePodfile);

            expect(podfile.match(/post_install do \|installer\|/g)).toHaveLength(1);
        });

        test("produces the same Podfile when it runs twice", async () => {
            const once = await runPodfileMod(templatePodfile);
            const twice = await runPodfileMod(once);

            expect(twice).toBe(once);
        });

        test("keeps every line of the template, in order", async () => {
            const podfileLines = (await runPodfileMod(templatePodfile)).split("\n");
            let position = 0;

            for (const line of templatePodfile.split("\n")) {
                position = podfileLines.indexOf(line, position);
                expect(position, `template line missing: ${line}`).toBeGreaterThanOrEqual(0);
                position += 1;
            }
        });
    });

    describe("when the Podfile has no post_install block", () => {
        test("throws a descriptive error", async () => {
            await expect(runPodfileMod("platform :ios, '15.1'\ntarget 'App' do\nend\n")).rejects.toThrow(
                "Could not inject post_install hook: expected 'post_install do |installer|' in Podfile"
            );
        });
    });
});
