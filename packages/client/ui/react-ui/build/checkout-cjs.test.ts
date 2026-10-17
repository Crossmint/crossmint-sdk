// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "tsup";
import { afterEach, describe, expect, it } from "vitest";
import checkoutConfig from "../tsup.config";

const fixtures: string[] = [];
afterEach(() => {
    for (const fixture of fixtures.splice(0)) {
        rmSync(fixture, { recursive: true, force: true });
    }
});

function fixture() {
    const root = mkdtempSync(join(tmpdir(), "checkout-cjs-"));
    fixtures.push(root);
    writeFileSync(
        join(root, "shared.ts"),
        `export async function* sequence(supplied?: { value: number }) {
            const value = supplied?.value ?? (yield await Promise.resolve(7));
            return value ?? (await Promise.resolve(11));
        }
        export const mode = import.meta.env ? import.meta.env.MODE : undefined;`
    );
    for (const name of ["alpha", "beta"]) {
        writeFileSync(join(root, `${name}.ts`), 'export { sequence, mode } from "./shared";');
    }
    return root;
}

async function compile(root: string, disableLowering = false) {
    const outDir = join(root, disableLowering ? "without-lowering" : "dist");
    await build({
        ...checkoutConfig,
        entry: [join(root, "alpha.ts"), join(root, "beta.ts")],
        outDir,
        config: false,
        onSuccess: undefined,
        dts: false,
        silent: true,
        minify: true,
        splitting: true,
        format: ["esm", "cjs"],
        // Exercise the real config without writing package notices outside the fixture.
        esbuildPlugins: [],
        esbuildOptions(options, context) {
            checkoutConfig.esbuildOptions?.(options, context);
            if (disableLowering && options.supported) {
                delete options.supported["nullish-coalescing"];
                delete options.supported["optional-chain"];
            }
        },
    });
    return outDir;
}

function execute(outDir: string) {
    return execFileSync(
        process.execPath,
        [
            "-e",
            `const alpha = require(${JSON.stringify(join(outDir, "alpha.cjs"))});
             const beta = require(${JSON.stringify(join(outDir, "beta.cjs"))});
             (async () => {
                 const resumed = alpha.sequence();
                 const fallback = beta.sequence();
                 console.log(JSON.stringify({
                     shared: alpha.sequence === beta.sequence,
                     noViteEnvironment: alpha.mode === undefined && beta.mode === undefined,
                     yield: await resumed.next(),
                     resume: await resumed.next(42),
                     supplied: await beta.sequence({value: 5}).next(),
                     fallbackYield: await fallback.next(),
                     fallbackReturn: await fallback.next()
                 }));
             })().catch(error => { console.error(error); process.exitCode = 1; });`,
        ],
        { encoding: "utf8", stdio: "pipe" }
    );
}

describe("checkout CommonJS splitting", () => {
    it("preserves nullish async generator behavior in real minified tsup chunks", async () => {
        const root = fixture();
        const outDir = await compile(root);
        expect(JSON.parse(execute(outDir))).toEqual({
            shared: true,
            noViteEnvironment: true,
            yield: { value: 7, done: false },
            resume: { value: 42, done: true },
            supplied: { value: 5, done: true },
            fallbackYield: { value: 7, done: false },
            fallbackReturn: { value: 11, done: true },
        });

        // Without esbuild lowering, tsup's CJS import transform puts yield in a
        // non-generator callback. Keep the fixture sensitive to that real failure.
        const withoutLowering = await compile(root, true);
        expect(() => execute(withoutLowering)).toThrow(/yield|reserved word|Unexpected|SyntaxError/);
    }, 60_000);
});
