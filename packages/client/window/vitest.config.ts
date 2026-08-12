import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        include: ["**/*.test.{ts,tsx}"],
        exclude: ["node_modules"],
        globals: true,
        alias: [{ find: "@", replacement: resolve(__dirname, "./src") }],
    },
});
