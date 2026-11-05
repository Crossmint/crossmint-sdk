import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, test } from "vitest";

import { withDeviceSigner } from "./withDeviceSigner";

const FIXTURES_DIR = path.resolve(__dirname, "../../test/fixtures");

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
    describe("when the Podfile was written by plugin version 1.7.x or earlier", () => {
        test("removes the old post_install block and the build from source lines", async () => {
            const legacy = fs.readFileSync(path.join(FIXTURES_DIR, "sdk-58", "Podfile.legacy-plugin"), "utf8");
            const template = fs.readFileSync(path.join(FIXTURES_DIR, "sdk-58", "Podfile"), "utf8");

            const podfile = await runPodfileMod(legacy);

            expect(legacy).toContain("CROSSMINT_RN_PREBUILT_FIX");
            expect(podfile).toBe(template);
        });
    });
});
