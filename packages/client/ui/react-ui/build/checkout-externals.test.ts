// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";
import { afterEach, describe, expect, it } from "vitest";
import { createCheckoutExternalsPlugin } from "./checkout-externals";

const fixtures: string[] = [];
afterEach(() => {
    for (const fixture of fixtures.splice(0)) {
        rmSync(fixture, { recursive: true, force: true });
    }
});

function fixture() {
    const root = mkdtempSync(join(tmpdir(), "checkout-externals-"));
    fixtures.push(root);
    function file(name: string, content: string) {
        mkdirSync(join(root, name, ".."), { recursive: true });
        writeFileSync(join(root, name), content);
    }
    function dependency(location: string, name: string, exports: Record<string, string>) {
        const directory = `${location}node_modules/${name}`;
        file(`${directory}/package.json`, JSON.stringify({ name, type: "module", exports }));
        return directory;
    }
    file("package.json", JSON.stringify({ name: "sdk-test", type: "module" }));
    const react = dependency("", "react", { "./jsx-runtime": "./jsx.js" });
    file(`${react}/jsx.js`, "export const jsx = () => 'react';");
    const crossmint = dependency("", "@crossmint/shared", { ".": "./index.js" });
    file(`${crossmint}/index.js`, "export class Shared {}");
    const zod = dependency("", "zod", { ".": "./index.js" });
    file(`${zod}/index.js`, "export const version = 'zod3';");
    const viem = dependency("", "viem", { ".": "./index.js" });
    file(`${viem}/index.js`, "export const version = 'viem-public';");
    for (const [name, entry] of [
        ["@mysten/sui", "./transactions"],
        ["@solana/web3.js", "."],
    ]) {
        const directory = dependency("", name, { [entry]: "./index.js" });
        file(`${directory}/index.js`, "export class Transaction {}");
    }
    const dynamic = dependency("", "dynamic-fixture", { ".": "./index.js" });
    const privateZod = dependency(`${dynamic}/`, "zod", { "./mini": "./mini.js" });
    file(`${privateZod}/mini.js`, "export const version = 'zod4-mini';");
    const privateViem = dependency(`${dynamic}/`, "viem", { ".": "./index.js" });
    file(`${privateViem}/index.js`, "export const version = 'viem-private';");
    file(
        `${dynamic}/index.js`,
        `import {version as zod} from 'zod/mini';
         import {version as viem} from 'viem';
         import {Transaction as SuiTransaction} from '@mysten/sui/transactions';
         import {Transaction as SolanaTransaction} from '@solana/web3.js';
         import {Shared} from '@crossmint/shared';
         import {jsx} from 'react/jsx-runtime';
         export {SuiTransaction, SolanaTransaction, Shared};
         export const privateVersions = [zod, viem, jsx()];`
    );
    file(
        "src/index.js",
        `import {version as zod} from 'zod';
         import {version as viem} from 'viem';
         import {Transaction as SuiTransaction} from '@mysten/sui/transactions';
         import {Transaction as SolanaTransaction} from '@solana/web3.js';
         import {Shared} from '@crossmint/shared';
         import * as dynamic from 'dynamic-fixture';
         export const proof = {
           versions: [zod, viem, ...dynamic.privateVersions],
           sameSui: SuiTransaction === dynamic.SuiTransaction,
           sameSolana: SolanaTransaction === dynamic.SolanaTransaction,
           sameCrossmint: Shared === dynamic.Shared
         };`
    );
    const runtimeDependencies = ["react", "@crossmint/shared", "zod", "viem", "@mysten/sui", "@solana/web3.js"];
    return { root, runtimeDependencies };
}

describe("checkout bundled dependency boundaries", () => {
    it("retains private dependency versions while sharing public package instances and contexts", async () => {
        const { root, runtimeDependencies } = fixture();
        const output = join(root, "bundle.mjs");
        const result = await build({
            entryPoints: [join(root, "src/index.js")],
            outfile: output,
            platform: "browser",
            format: "esm",
            bundle: true,
            metafile: true,
            plugins: [createCheckoutExternalsPlugin({ sourceRoot: join(root, "src"), runtimeDependencies })],
        });
        const proof = JSON.parse(
            execFileSync(
                process.execPath,
                [
                    "--input-type=module",
                    "-e",
                    `import {proof} from ${JSON.stringify(output)}; console.log(JSON.stringify(proof));`,
                ],
                { encoding: "utf8" }
            )
        );
        expect(proof).toEqual({
            versions: ["zod3", "viem-public", "zod4-mini", "viem-private", "react"],
            sameSui: true,
            sameSolana: true,
            sameCrossmint: true,
        });
        const inputs = Object.keys(result.metafile?.inputs ?? {});
        expect(inputs.some((input) => input.includes("dynamic-fixture/node_modules/zod/mini.js"))).toBe(true);
        expect(inputs.some((input) => input.includes("dynamic-fixture/node_modules/viem/index.js"))).toBe(true);
        expect(inputs.some((input) => input.includes("node_modules/react/"))).toBe(false);
        expect(inputs.some((input) => input.includes("node_modules/@mysten/sui/"))).toBe(false);
        expect(inputs.some((input) => input.includes("node_modules/@solana/web3.js/"))).toBe(false);
    }, 30_000);

    it("demonstrates why globally externalizing the SDK dependencies is unsafe", async () => {
        const { root, runtimeDependencies } = fixture();
        const output = join(root, "naive-bundle.mjs");
        await build({
            entryPoints: [join(root, "src/index.js")],
            outfile: output,
            platform: "browser",
            format: "esm",
            bundle: true,
            external: runtimeDependencies,
        });
        expect(() =>
            execFileSync(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(output)})`], {
                encoding: "utf8",
                stdio: "pipe",
            })
        ).toThrow(/Package subpath '\.\/mini' is not defined by "exports"/);
    }, 30_000);
});
