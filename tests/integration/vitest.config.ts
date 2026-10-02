import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["**/*.test.ts"],
        exclude: ["node_modules"],
        globals: true,
        setupFiles: [resolve(__dirname, "./vitest.setup.ts")],
        // security.test.ts's rate-limit bursts would otherwise spill into other files' tests.
        fileParallelism: false,
    },
});
