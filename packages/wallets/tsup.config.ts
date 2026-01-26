import type { Options } from "tsup";
import { treeShakableConfig } from "../../tsup.config.base";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const config: Options = {
    ...treeShakableConfig,
    async onSuccess() {
        // Build the BrowserDeviceSignerStorage as a standalone injectable script
        const { build } = await import("esbuild");

        const outDir = "./dist/injected";
        mkdirSync(outDir, { recursive: true });

        // Compile just the storage class as an IIFE for use in webviews
        await build({
            entryPoints: ["./src/signers/device-signer/device-signer-storage-browser.ts"],
            bundle: true,
            minify: false, // Disable minification for less-verbose error logs
            format: "iife",
            globalName: "CrossmintBrowserStorage",
            platform: "browser",
            target: "es2020",
            outfile: `${outDir}/device-signer-storage-browser.js`,
        });

        // Read the compiled JavaScript
        const jsRaw = readFileSync(join(outDir, "device-signer-storage-browser.js"), "utf-8");

        // Generate a robust Buffer polyfill from the existing 'buffer/' package
        const polyfillBuild = await build({
            stdin: {
                contents: `import { Buffer } from "buffer/";\n(function(){ if (typeof window !== 'undefined' && typeof (window as any).Buffer === 'undefined') { (window as any).Buffer = Buffer as any; } })();`,
                resolveDir: process.cwd(),
                sourcefile: "polyfill-buffer.ts",
                loader: "ts",
            },
            bundle: true,
            minify: false, // Disable minification for less-verbose error logs
            format: "iife",
            platform: "browser",
            target: "es2020",
            write: false,
        });

        const polyfills = polyfillBuild.outputFiles?.[0]?.text ?? "";

        const jsContent = polyfills + "\n" + jsRaw;

        // Create TypeScript file that exports the script as a string
        const tsContent = `// Auto-generated file - do not edit manually
// This file contains the compiled BrowserDeviceSignerStorage class as an IIFE
// Source: packages/wallets/src/signers/device-signer/device-signer-storage-browser.ts
// 
// Usage: Import this in your webview wrapper to access the storage class
// The class is available as: CrossmintBrowserStorage.BrowserDeviceSignerStorage

export const BROWSER_DEVICE_SIGNER_STORAGE_SCRIPT = ${JSON.stringify(jsContent)};
`;

        writeFileSync(join(outDir, "device-signer-storage-browser-script.ts"), tsContent);

        // Create the type definition file
        const dtsContent = `// Auto-generated file - do not edit manually
// This file contains the compiled BrowserDeviceSignerStorage class as an IIFE
// Source: packages/wallets/src/signers/device-signer/device-signer-storage-browser.ts

export declare const BROWSER_DEVICE_SIGNER_STORAGE_SCRIPT: string;
`;

        writeFileSync(join(outDir, "device-signer-storage-browser-script.d.ts"), dtsContent);

        // Compile the TypeScript export file to JavaScript
        await build({
            entryPoints: [join(outDir, "device-signer-storage-browser-script.ts")],
            bundle: false,
            format: "esm",
            platform: "node",
            target: "es2020",
            outfile: `${outDir}/device-signer-storage-browser-script.js`,
        });

        console.log("✓ Built injectable BrowserDeviceSignerStorage script");
    },
};

export default config;
