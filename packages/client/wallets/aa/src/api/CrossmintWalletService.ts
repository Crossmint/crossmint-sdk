import type { UserParams } from "@/types";
import { PasskeySignerData, StoreAbstractWalletInput } from "@/types/API";
import { CrossmintServiceError } from "@/types/Error";

import type { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { BaseCrossmintService } from "./BaseCrossmintService";

export { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export class CrossmintWalletService extends BaseCrossmintService {
    async storeAbstractWallet(user: UserParams, input: StoreAbstractWalletInput) {
        return this.fetchCrossmintAPI(
            "sdk/smart-wallet",
            { method: "POST", body: JSON.stringify(input) },
            "Error creating abstract wallet. Please contact support",
            user.jwt
        );
    }

    async getAbstractWalletEntryPointVersion(user: UserParams, chain: EVMBlockchainIncludingTestnet) {
        return this.fetchCrossmintAPI(
            `sdk/smart-wallet/entry-point-version?chain=${chain}`,
            { method: "GET" },
            `Error getting entry point version. Please contact support`,
            user.jwt
        );
    }

    async getPasskeySigner(user: UserParams): Promise<PasskeySignerData | null> {
        try {
            const signers = await this.fetchCrossmintAPI(
                `sdk/smart-wallet/signers?type=passkeys`,
                { method: "GET" },
                "Error fetching passkey validator signer. Please contact support",
                user.jwt
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

    async fetchNFTs(address: string, chain: EVMBlockchainIncludingTestnet) {
        return this.fetchCrossmintAPI(
            `v1-alpha1/wallets/${chain}:${address}/nfts`,
            { method: "GET" },
            `Error fetching NFTs for wallet: ${address}`
        );
    }

    public getPasskeyServerUrl() {
        return this.crossmintBaseUrl + `/internal/passkeys/${this.crossmintAPIHeaders["x-api-key"]}`;
    }
}
