import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
    input: "src/services/agent-checkouts/openapi.json",
    output: "src/services/agent-checkouts/gen",
    plugins: [
        "@hey-api/client-fetch",
        {
            name: "@hey-api/sdk",
            validator: false,
        },
        {
            name: "zod",
            compatibilityVersion: 3,
        },
    ],
});
