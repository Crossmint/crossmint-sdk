import { CrossmintService } from "@/services/CrossmintService";

// TODO: WAL-2563: this should resolve the user
export async function verifyCrossmintSessionToken(
    apiKey: string,
    token: string,
    environment: "production" | "staging"
) {
    const crossmintService = new CrossmintService(apiKey, token, environment);

    let response;
    try {
        response = await crossmintService.fetchCrossmintAPI({
            endpoint: "/sdk/auth/me",
            options: {
                method: "POST",
            },
        });
    } catch (error) {
        //TODO: track error
        return false;
    }

    return response;
}
