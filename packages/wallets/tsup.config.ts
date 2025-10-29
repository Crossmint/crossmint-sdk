import type { Options } from "tsup";
import { treeShakableConfig } from "../../tsup.config.base";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const config: Options = {
    ...treeShakableConfig,
    async onSuccess() {
        // Build the BrowserShadowSignerStorage as a standalone injectable script
        const { build } = await import("esbuild");

        const outDir = "./dist/injected";
        mkdirSync(outDir, { recursive: true });

        // Compile just the storage class as an IIFE for use in webviews
        await build({
            entryPoints: ["./src/signers/shadow-signer/shadow-signer-storage-browser.ts"],
            bundle: true,
            minify: true,
            format: "iife",
            globalName: "CrossmintBrowserStorage",
            platform: "browser",
            target: "es2020",
            outfile: `${outDir}/shadow-signer-storage-browser.js`,
        });

        // Read the compiled JavaScript
        const jsContent = readFileSync(join(outDir, "shadow-signer-storage-browser.js"), "utf-8");

        // Create TypeScript file that exports the script as a string
        const tsContent = `// Auto-generated file - do not edit manually
// This file contains the compiled BrowserShadowSignerStorage class as an IIFE
// Source: packages/wallets/src/signers/shadow-signer/shadow-signer-storage-browser.ts
// 
// Usage: Import this in your webview wrapper to access the storage class
// The class is available as: CrossmintBrowserStorage.BrowserShadowSignerStorage

export const BROWSER_SHADOW_SIGNER_STORAGE_SCRIPT = ${JSON.stringify(jsContent)};
`;

        writeFileSync(join(outDir, "shadow-signer-storage-browser-script.ts"), tsContent);

        // Create the type definition file
        const dtsContent = `// Auto-generated file - do not edit manually
// This file contains the compiled BrowserShadowSignerStorage class as an IIFE
// Source: packages/wallets/src/signers/shadow-signer/shadow-signer-storage-browser.ts

export declare const BROWSER_SHADOW_SIGNER_STORAGE_SCRIPT: string;
`;

        writeFileSync(join(outDir, "shadow-signer-storage-browser-script.d.ts"), dtsContent);

        // Compile the TypeScript export file to JavaScript
        await build({
            entryPoints: [join(outDir, "shadow-signer-storage-browser-script.ts")],
            bundle: false,
            format: "esm",
            platform: "node",
            target: "es2020",
            outfile: `${outDir}/shadow-signer-storage-browser-script.js`,
        });

        console.log("✓ Built injectable BrowserShadowSignerStorage script");
    },
};

export default config;
