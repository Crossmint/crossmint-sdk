import { VerifiableCredential } from "@/types/verifiableCredential";

import { getEnvironmentBaseUrl } from "@crossmint/client-sdk-base";

import { CrossmintAPI } from "../services/crossmintAPI";

export async function getCredentialFromId(credentialId: string, environment: string) {
    const baseUrl = getEnvironmentBaseUrl(environment);
    const headers = CrossmintAPI.getHeaders();

    console.debug(`Fetching credential ${credentialId}`);
    const url = `${baseUrl}/api/unstable/credentials/${credentialId}`;
    const options = { method: "GET", headers: headers };
    console.log(url, options);
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(
                `HTTP error! status: ${response.status}, responses: ${response.statusText}, ${response.body}`
            );
        }
        const credential = (await response.json()) as VerifiableCredential;
        return credential;
    } catch (error) {
        console.error(error);
        return null;
    }
}
