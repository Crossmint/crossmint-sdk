import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // Mirrors the `@/*` path in tsconfig.json so tests can load modules that use it.
        alias: [{ find: /^@\//, replacement: `${resolve(__dirname, "./src")}/` }],
    },
});
