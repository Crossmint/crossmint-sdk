import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
        exclude: [
            "node_modules",
            "dist",
            "coverage",
            "e2e/**",
            "**/e2e/**",
            "**/playwright-report/**",
            "**/test-results/**",
        ],
        passWithNoTests: true,
    },
});
