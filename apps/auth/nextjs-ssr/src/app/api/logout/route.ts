import { createCrossmint, CrossmintAuth } from "@crossmint/server-sdk";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const crossmint = createCrossmint({
            apiKey: process.env.SERVER_CROSSMINT_API_KEY || "",
        });
        const crossmintAuth = CrossmintAuth.from(crossmint);
        const response = await crossmintAuth.logout(request);

        return response as Response;
    } catch (error) {
        console.error(error);
    }
}
