import { crossmintAPI } from "@/crossmintAPI";
import type { EncryptedVerifiableCredential } from "@/verifiableCredentialsSDK";

/**
 * Service for handling wallet-based authentication and decryption with Crossmint.
 *
 * The `WalletAuthService` class provides methods to retrieve a challenge for wallet authentication and to decrypt credentials using that challenge.
 */
export class WalletAuthService {
    /**
     * Retrieves a challenge nonce for wallet authentication.
     *
     * This method requests a challenge from Crossmint that can be signed by the user's wallet to authenticate the user.
     *
     * @param userAddress - The blockchain address of the user requesting the challenge.
     * @returns A promise that resolves to a string representing the challenge to sign.
     *
     * @throws Will throw an error if the challenge request fails or if the response is invalid.
     */
    async getChallenge(userAddress: string): Promise<string> {
        const baseUrl = crossmintAPI.getBaseUrl();
        const headers = crossmintAPI.getHeaders(true);

        const url = `${baseUrl}/api/v1-alpha1/credentials/auth/wallet`;

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

    /**
     * Decrypts an encrypted verifiable credential using a signed challenge.
     *
     * This method sends the signed challenge, the user's address, and the encrypted credential to Crossmint for decryption.
     *
     * @param credential - The encrypted verifiable credential to decrypt.
     * @param challenge - The challenge that was signed by the user's wallet.
     * @param signature - The signature of the challenge signed by the user's wallet.
     * @param userAddress - The blockchain address of the user requesting decryption.
     * @returns A promise that resolves to the decrypted data.
     *
     * @throws Will throw an error if the decryption request fails or if the response is invalid.
     */
    async decrypt(
        credential: EncryptedVerifiableCredential,
        challenge: string,
        signature: string,
        userAddress: string
    ): Promise<any> {
        const baseUrl = crossmintAPI.getBaseUrl();
        const headers = crossmintAPI.getHeaders(true);

        const url = `${baseUrl}/api/v1-alpha1/credentials/decryption/decrypt`;

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
