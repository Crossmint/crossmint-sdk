import { crossmintAPI } from "@/crossmintAPI";
import { EncryptedVerifiableCredential } from "@/verifiableCredentialsSDK";

export class WalletAuthService {
    async getChallenge(userAddress: string): Promise<string> {
        const baseUrl = crossmintAPI.getBaseUrl();
        const headers = crossmintAPI.getHeaders(true);

        const url = `${baseUrl}/api/unstable/credentials/walletAuth`;

        const options = { method: "POST", headers: headers, body: JSON.stringify({ address: userAddress }) };
        console.log(url, options);

        const response = await fetch(url, options);
        const challenge = (await response.json()).nonce as string;
        if (!response.ok) {
            throw new Error(
                `Failed to get challenge. status: ${response.status}, responses: ${JSON.stringify(challenge)}`
            );
        }
        if (challenge == null) {
            throw new Error("Failed to get challenge from Crossmint");
        }
        console.debug(`Successfully retrieved challenge for user ${userAddress} from Crossmint`);

        return challenge;
    }

    async decrypt(
        credential: EncryptedVerifiableCredential,
        challenge: string,
        signature: string,
        userAddress: string
    ): Promise<any> {
        const baseUrl = crossmintAPI.getBaseUrl();
        const headers = crossmintAPI.getHeaders(true);

        const url = `${baseUrl}/api/unstable/credentials/decrypt`;

        const options = {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                address: userAddress,
                encryptedCredential: credential,
                nonce: challenge,
                signature: signature,
            }),
        };
        console.log(url, options);

        const response = await fetch(url, options);
        const decryptedData = (await response.json()) as any;
        if (!response.ok) {
            throw new Error(
                `Failed to decrypt. status: ${response.status}, responses: ${JSON.stringify(decryptedData)}`
            );
        }
        console.debug(`Successfully decrypted data from Crossmint`);

        return decryptedData;
    }
}
