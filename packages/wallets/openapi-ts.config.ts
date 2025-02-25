import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
    input: "src/openapi.json",
    output: "src/api/gen",
    plugins: [
        "@hey-api/client-fetch",
        {
            name: "@hey-api/sdk",
            validator: false,
        },
    ],
});
