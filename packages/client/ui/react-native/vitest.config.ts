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
        alias: [
            { find: "@", replacement: resolve(__dirname, "./src") },
            // rn-window's transport imports this polyfill, which requires Flow-typed react-native.
            // Aliased rather than vi.mock'd because rn-window resolves its own copy of the package,
            // which a mock declared in a test file here does not intercept.
            {
                find: /^react-native-get-random-values$/,
                replacement: resolve(__dirname, "./test/stubs/react-native-get-random-values.ts"),
            },
        ],
    },
});
