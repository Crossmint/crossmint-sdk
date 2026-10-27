import fs from "fs";
import os from "os";
import path from "path";
import { beforeEach, describe, expect, test } from "vitest";

import { withDeviceSigner } from "./withDeviceSigner";

const FIXTURES_DIR = path.resolve(__dirname, "../../test/fixtures");
const SDK_VERSIONS = ["sdk-58"];

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

function readFixture(sdk: string, name: string): string {
    return fs.readFileSync(path.join(FIXTURES_DIR, sdk, name), "utf8");
}

describe("withDeviceSigner", () => {
    describe.each(SDK_VERSIONS)("with the Expo %s Podfile template", (sdk) => {
        let templatePodfile: string;

        beforeEach(() => {
            templatePodfile = readFixture(sdk, "Podfile");
        });

        test("leaves the Podfile unchanged", async () => {
            expect(await runPodfileMod(templatePodfile)).toBe(templatePodfile);
        });

        describe("when the Podfile was written by plugin version 2.0.x", () => {
            test("removes the CrossmintDeviceSigner simulator fix", async () => {
                const previous = readFixture(sdk, "Podfile.previous-plugin");

                const podfile = await runPodfileMod(previous);

                expect(previous).toContain("if target.name == 'CrossmintDeviceSigner'");
                expect(podfile).toBe(templatePodfile);
            });
        });

        describe("when the Podfile was written by plugin version 1.7.x or earlier", () => {
            test("removes the old post_install block and the build from source lines", async () => {
                const legacy = readFixture(sdk, "Podfile.legacy-plugin");

                const podfile = await runPodfileMod(legacy);

                expect(legacy).toContain("CROSSMINT_RN_PREBUILT_FIX");
                expect(legacy).toContain("CrossmintExpoFixes.pch");
                expect(podfile).toBe(templatePodfile);
            });
        });
    });

    describe("when the Podfile has no post_install block", () => {
        test("leaves the Podfile unchanged", async () => {
            const podfile = "platform :ios, '15.1'\ntarget 'App' do\nend\n";

            expect(await runPodfileMod(podfile)).toBe(podfile);
        });
    });
});
