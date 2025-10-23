import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // This is needed because we are using the @ symbol to import from the src folder.
        // Otherwise, Vitest will yell at us.
        alias: [{ find: "@", replacement: resolve(__dirname, "./src") }],
    },
});
