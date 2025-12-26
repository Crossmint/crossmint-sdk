import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["**/*.test.{ts,tsx}"],
        exclude: ["node_modules"],
        globals: true,
        setupFiles: [resolve(__dirname, "./src/wallets/__tests__/setup.ts")],
        // Resolves @ imports to the src directory for Vitest
        alias: [{ find: "@", replacement: resolve(__dirname, "./src") }],
    },
});
