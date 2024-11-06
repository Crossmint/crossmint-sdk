import { createCrossmint, CrossmintAuth } from "@crossmint/server-sdk";

export async function POST() {
    try {
        const crossmint = createCrossmint({
            apiKey: process.env.SERVER_CROSSMINT_API_KEY || "",
        });
        const crossmintAuth = CrossmintAuth.from(crossmint);
        const response = await crossmintAuth.logout();

        return response as Response;
    } catch (error) {
        console.error(error);
    }
}
