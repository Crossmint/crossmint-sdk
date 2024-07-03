import { CrossmintService } from "@/services/CrossmintService";

//TODO: this should resolve the user
export async function verifyCrossmintSessionToken(token: string, environment: "production" | "staging") {
    const crossmintService = new CrossmintService(token, environment);

    let response;
    try {
        response = await crossmintService.fetchCrossmintAPI({
            endpoint: "/sdk/auth/verifyJWT",
            options: {
                method: "POST",
                body: {
                    token,
                },
            },
        });
    } catch (error) {
        //TODO: track error
        return false;
    }

    return response;
}
