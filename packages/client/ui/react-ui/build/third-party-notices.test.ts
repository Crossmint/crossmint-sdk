// @vitest-environment node
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "tsup";
import { afterEach, describe, expect, it, vi } from "vitest";
import { thirdPartyNoticesPlugin } from "./third-party-notices";

const directories: string[] = [];
vi.setConfig({ testTimeout: 20_000 });

afterEach(async () => {
    await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function fixture(name = "fixture-library") {
    const directory = await mkdtemp(join(tmpdir(), "crossmint-notices-"));
    directories.push(directory);
    const dependency = join(directory, "node_modules", name);
    await mkdir(dependency, { recursive: true });
    await writeFile(join(directory, "package.json"), JSON.stringify({ name: "fixture-project", private: true }));
    await writeFile(join(directory, "entry.js"), `export { answer } from "${name}";`);
    await writeFile(join(dependency, "package.json"), JSON.stringify({ name, version: "1.0.0", main: "index.js" }));
    await writeFile(join(dependency, "index.js"), "/*! Copyright fixture author. */\nexports.answer = 42;");
    return { directory, dependency, outDir: join(directory, "dist") };
}

async function bundle(
    input: Awaited<ReturnType<typeof fixture>>,
    platform: "browser" | "node" = "browser",
    alias: Record<string, string> = {}
) {
    await build({
        config: false,
        entry: [join(input.directory, "entry.js")],
        outDir: input.outDir,
        format: ["esm"],
        outExtension: () => ({ js: ".mjs" }),
        platform,
        bundle: true,
        skipNodeModulesBundle: false,
        noExternal: [/.*/],
        silent: true,
        esbuildOptions(options) {
            options.alias = alias;
            options.logLevel = "silent";
        },
        esbuildPlugins: [thirdPartyNoticesPlugin(input.outDir)],
    });
}

describe("thirdPartyNoticesPlugin", () => {
    it("includes complete license and notice files from the bundled graph and preserves legal comments", async () => {
        const input = await fixture();
        await writeFile(join(input.dependency, "LICENSE"), "MIT license text\nCopyright fixture author.\n");
        await writeFile(join(input.dependency, "NOTICE"), "Additional attribution required.\n");
        await mkdir(join(input.directory, "node_modules", "unused-library"));
        await writeFile(join(input.directory, "node_modules", "unused-library", "package.json"), JSON.stringify({ name: "unused-library" }));
        await bundle(input);
        const notices = await readFile(join(input.outDir, "THIRD_PARTY_NOTICES.txt"), "utf8");
        expect(notices).toContain("=== fixture-library@1.0.0 ===");
        expect(notices).toContain("MIT license text\nCopyright fixture author.");
        expect(notices).toContain("Additional attribution required.");
        expect(notices).not.toContain("unused-library");
        expect(notices.match(/=== fixture-library@1.0.0 ===/g)).toHaveLength(1);
        expect(await readFile(join(input.outDir, "entry.mjs"), "utf8")).toContain("Copyright fixture author.");
    });

    it("finds the installed package license when a distribution folder repeats its named manifest", async () => {
        const input = await fixture("@fixture/scoped-library");
        const manifest = { name: "@fixture/scoped-library", version: "1.0.0", license: "SEE LICENSE IN LICENSE.md" };
        await writeFile(join(input.dependency, "package.json"), JSON.stringify({ ...manifest, main: "dist/esm/index.js" }));
        await mkdir(join(input.dependency, "dist", "esm"), { recursive: true });
        await writeFile(join(input.dependency, "dist", "esm", "package.json"), JSON.stringify(manifest));
        await writeFile(join(input.dependency, "dist", "esm", "index.js"), "exports.answer = 42;");
        await writeFile(join(input.dependency, "LICENSE.md"), "The package-root license.");
        await bundle(input);
        expect(await readFile(join(input.outDir, "THIRD_PARTY_NOTICES.txt"), "utf8")).toContain("The package-root license.");
    });

    it("honestly records unavailable metadata without inventing a license or blocking the build", async () => {
        const input = await fixture();
        await bundle(input);
        const notices = await readFile(join(input.outDir, "THIRD_PARTY_NOTICES.txt"), "utf8");
        expect(notices).toContain("Declared license: NOASSERTION");
        expect(notices).toContain("Published license/notice files: unavailable");
        expect(notices).toContain("https://registry.npmjs.org/fixture-library/1.0.0");
        expect(notices).not.toContain("MIT");
    });

    it("uses verified supplemental text only for its exact package version and declared license", async () => {
        const input = await fixture("formik");
        await writeFile(join(input.dependency, "package.json"), JSON.stringify({ name: "formik", version: "2.2.9", license: "Apache-2.0", main: "index.js" }));
        await bundle(input);
        expect(await readFile(join(input.outDir, "THIRD_PARTY_NOTICES.txt"), "utf8")).toContain("formik@2.2.9/LICENSE");
        await writeFile(join(input.dependency, "package.json"), JSON.stringify({ name: "formik", version: "2.2.10", license: "Apache-2.0", main: "index.js" }));
        await bundle(input);
        expect(await readFile(join(input.outDir, "THIRD_PARTY_NOTICES.txt"), "utf8")).not.toContain("formik@2.2.9/LICENSE");
    });

    it("rejects bigint-buffer's browser entry and accepts an independent first-party adapter alias", async () => {
        const input = await fixture("bigint-buffer");
        await mkdir(join(input.dependency, "dist"));
        await writeFile(join(input.dependency, "package.json"), JSON.stringify({
            name: "bigint-buffer", version: "1.1.5", main: "dist/node.js",
            browser: { "./dist/node.js": "./dist/browser.js" },
        }));
        await writeFile(join(input.dependency, "dist", "node.js"), "exports.answer = 1;");
        await writeFile(join(input.dependency, "dist", "browser.js"), "exports.answer = 42;");
        await writeFile(join(input.dependency, "LICENSE"), "Apache-2.0 license text.");
        await expect(bundle(input)).rejects.toThrow("bigint-buffer/dist/browser.js");
        const adapter = join(input.directory, "solana-bigint.js");
        await writeFile(adapter, "export const answer = 42;");
        await bundle(input, "browser", { "bigint-buffer": adapter });
        expect(await readFile(join(input.outDir, "THIRD_PARTY_NOTICES.txt"), "utf8")).not.toContain("bigint-buffer");
    });

    it.each(["sharp", "bindings", "ws"])("rejects bundled server-only %s code", async (name) => {
        const input = await fixture(name);
        await writeFile(join(input.dependency, "LICENSE"), "Fixture license text.");
        await expect(bundle(input)).rejects.toThrow(name === "ws" ? "Node ws implementation" : "native dependency");
    });
});
