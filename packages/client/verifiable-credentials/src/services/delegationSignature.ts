import { crossmintAPI } from "@/crossmintAPI";
import type { AuthSig } from "@lit-protocol/types";

export class DelegationSignature {
    async getSignature(): Promise<AuthSig> {
        const baseUrl = crossmintAPI.getBaseUrl();
        const headers = crossmintAPI.getHeaders();

        const url = `${baseUrl}/api/v1-alpha1/credentials/decryption/delegateLitCapacity`;

        const options = { method: "GET", headers: headers };
        console.log(url, options);

        const response = await fetch(url, options);
        const sig = (await response.json()) as AuthSig;
        if (!response.ok) {
            throw new Error(`Failed to get signature. status: ${response.status}, responses: ${JSON.stringify(sig)}`);
        }

        if (sig.sig == null) {
            throw new Error(`Failed to get signature from crossmint`);
        }
        console.debug(`Successfully retrieved delegation signature from Crossmint`);

        return sig;
    }
}
