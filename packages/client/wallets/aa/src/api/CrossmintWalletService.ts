import type { SignerData, StoreAbstractWalletInput, UserParams } from "@/types";
import { CrossmintServiceError } from "@/utils/error";

import type { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { BaseCrossmintService } from "./BaseCrossmintService";

export { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export class CrossmintWalletService extends BaseCrossmintService {
    async storeAbstractWallet(input: StoreAbstractWalletInput) {
        return this.fetchCrossmintAPI(
            "unstable/wallets/aa/wallets",
            { method: "POST", body: JSON.stringify(input) },
            "Error creating abstract wallet. Please contact support"
        );
    }

    async getAbstractWalletEntryPointVersion(user: UserParams, chain: EVMBlockchainIncludingTestnet) {
        return this.fetchCrossmintAPI(
            `v1-alpha1/wallets/entry-point-version?${this.encodeUser(user)}&chain=${chain}`,
            { method: "GET" },
            `Error getting entry point version. Please contact support`
        );
    }

    async fetchNFTs(address: string, chain: EVMBlockchainIncludingTestnet) {
        return this.fetchCrossmintAPI(
            `v1-alpha1/wallets/${chain}:${address}/nfts`,
            { method: "GET" },
            `Error fetching NFTs for wallet: ${address}`
        );
    }

    async getPasskeyValidatorSigner(user: UserParams): Promise<SignerData | null> {
        try {
            const signers = await this.fetchCrossmintAPI(
                `unstable/wallets/aa/signers?${this.encodeUser(user)}&type=passkeys`,
                { method: "GET" },
                "Error fetching passkey validator signer. Please contact support"
            );

            if (signers.length === 0) {
                return null;
            }

            if (signers.length > 1) {
                throw new Error("Config Error"); // TODO use error as defined by SDK
            }

            return signers[0].signerData;
        } catch (e: any) {
            if (e instanceof CrossmintServiceError && e.status === 404) {
                return null;
            }

            throw e;
        }
    }

    public getPasskeyServerUrl(user: UserParams): string {
        return (
            this.crossmintBaseUrl +
            `/unstable/passkeys/${this.crossmintAPIHeaders["x-api-key"]}/${this.encodeUser(user)}`
        );
    }

    private encodeUser(user: UserParams) {
        return `userId=${user.id}`;
    }
}
