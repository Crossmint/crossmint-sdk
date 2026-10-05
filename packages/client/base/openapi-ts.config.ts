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
            "~resolvers": {
                // A null-only enum (`z.null()` in the API) has no members to build from.
                enum: (ctx) => {
                    const { isNullable, literalMembers } = ctx.nodes.items(ctx);
                    if (literalMembers.length === 0 && isNullable) {
                        return ctx.$(ctx.symbols.z).attr("null").call();
                    }
                    return undefined;
                },
            },
        },
    ],
});
