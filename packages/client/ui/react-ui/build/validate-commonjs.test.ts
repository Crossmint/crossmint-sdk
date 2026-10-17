// @vitest-environment node
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateCommonJs } from "./validate-commonjs";

const directories: string[] = [];

afterEach(async () => {
    await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function fixture(files: Record<string, string>) {
    const directory = await mkdtemp(join(tmpdir(), "crossmint-commonjs-"));
    directories.push(directory);
    for (const [name, source] of Object.entries(files)) {
        const filename = join(directory, name);
        await mkdir(dirname(filename), { recursive: true });
        await writeFile(filename, source);
    }
    return directory;
}

describe("validateCommonJs", () => {
    it("accepts the CommonJS wrapper syntax in every chunk without executing side effects", async () => {
        const files = {
            "index.cjs": 'require("not-installed"); throw new Error("must never run"); return module.exports;',
            "chunks/lazy.cjs": 'exports.location = __dirname; module.exports = __filename; return;',
        };
        const directory = await fixture(files);
        const before = await readdir(directory, { recursive: true });

        await expect(validateCommonJs(directory)).resolves.toBeUndefined();

        expect(await readdir(directory, { recursive: true })).toEqual(before);
        for (const [name, source] of Object.entries(files)) {
            expect(await readFile(join(directory, name), "utf8")).toBe(source);
        }
    });

    it("rejects import.meta in a nested lazy chunk and reports only a short filename and error", async () => {
        const source = `/* ${"private bundled source ".repeat(100)} */\nmodule.exports = import.meta.env;`;
        const directory = await fixture({ "index.cjs": "module.exports = 1;", "chunks/nested/lazy.cjs": source });

        await expect(validateCommonJs(directory)).rejects.toThrow(/chunks\/nested\/lazy\.cjs:.*import\.meta/);
        try {
            await validateCommonJs(directory);
        } catch (error) {
            expect((error as Error).message.length).toBeLessThan(300);
            expect((error as Error).message).not.toContain("private bundled source");
            expect((error as Error).message).not.toContain(directory);
        }
    });

    it("rejects generator syntax broken by moving a yield into a non-generator callback", async () => {
        const directory = await fixture({
            "chunks/generator.cjs": "function* request() { const value = (() => { return yield fetch(); })(); return value; }",
        });

        await expect(validateCommonJs(directory)).rejects.toThrow(/CommonJS syntax check failed for chunks\/generator\.cjs:/);
    });

    it("ignores ESM, declarations, source maps, and other non-CommonJS files", async () => {
        const directory = await fixture({
            "index.cjs": "module.exports = 1;",
            "index.js": "export const environment = import.meta.env;",
            "index.mjs": "export {};",
            "index.d.ts": "export declare const value: string;",
            "index.d.cts": "export declare const value: string;",
            "index.cjs.map": "not JavaScript syntax",
        });

        await expect(validateCommonJs(directory)).resolves.toBeUndefined();
    });
});
