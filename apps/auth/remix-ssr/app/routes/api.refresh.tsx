import { createCrossmint, CrossmintAuth } from "@crossmint/server-sdk";
import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
    if (request.method !== "POST") {
        return new Response(null, { status: 405 });
    }

    try {
        const crossmint = createCrossmint({
            apiKey: process.env.SERVER_CROSSMINT_API_KEY || "",
        });
        const crossmintAuth = CrossmintAuth.from(crossmint);
        const response = await crossmintAuth.handleCustomRefresh(request);

        return response;
    } catch (error) {
        console.error(error);
        return new Response(null, { status: 500 });
    }
}
