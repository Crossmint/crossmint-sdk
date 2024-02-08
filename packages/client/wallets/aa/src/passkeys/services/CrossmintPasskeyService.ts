import { BaseCrossmintService } from "@/api/BaseCrossmintService";
import { PasskeyCipher } from "@/types";

export class CrossmintPasskeyService extends BaseCrossmintService {
    async getPasskeyCiphers(walletLocator: string): Promise<PasskeyCipher> {
        const response = await this.fetchCrossmintAPI(
            `v1-alpha1/passkeys/ciphers/${walletLocator}`,
            { method: "GET" },
            `Error fetching passkeys ciphers for: ${walletLocator}`
        );
        return {
            chain: response.chain,
            walletAddress: response.walletAddress,
            cipher: {
                method: response.cipherMethod,
                data: response.cipherData,
            },
        };
    }

    async upsertPasskeyCiphers(walletLocator: string, passkeyCipher: any) {
        return this.fetchCrossmintAPI(
            `v1-alpha1/passkeys/ciphers/${walletLocator}`,
            {
                method: "PUT",
                body: JSON.stringify(passkeyCipher),
            },
            `Error updating passkey ciphers: ${passkeyCipher}`
        );
    }

    async getCapacityCreditsOwnerSignature() {
        return this.fetchCrossmintAPI(
            `v1-alpha1/passkeys/ciphers/capacity-credits-owner-signature`,
            { method: "GET" },
            `Error fetching capacity credits owner signature`
        );
    }
}
