import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["heartbeat/**/*.test.ts"],
        exclude: ["node_modules"],
        globals: true,
        setupFiles: [resolve(__dirname, "./vitest.setup.ts")],
        fileParallelism: false,
        // Every test is one or two round trips to preview, plus on-chain confirmation for funding.
        testTimeout: 60_000,
        hookTimeout: 120_000,
    },
});
