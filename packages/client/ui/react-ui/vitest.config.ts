import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        include: ["**/*.test.{ts,tsx}"],
        exclude: ["node_modules"],
        globals: true,
        // This is needed because we are using the @ symbol to import from the src folder.
        // Otherwise, Vitest will yell at us.
        alias: [{ find: "@", replacement: resolve(__dirname, "./src") }],
    },
});
