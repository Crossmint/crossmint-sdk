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
    },
});
