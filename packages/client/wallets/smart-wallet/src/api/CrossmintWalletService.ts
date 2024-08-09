import { SmartWalletChain } from "@/blockchain/chains";
import { CrossmintServiceError } from "@/error";
import { SignerData, StoreSmartWalletParams } from "@/types/API";
import type { UserParams } from "@/types/Config";
import { API_VERSION } from "@/utils/constants";

import { BaseCrossmintService } from "./BaseCrossmintService";

export class CrossmintWalletService extends BaseCrossmintService {
    async idempotentCreateSmartWallet(user: UserParams, input: StoreSmartWalletParams) {
        return this.fetchCrossmintAPI(
            `${API_VERSION}/sdk/smart-wallet`,
            { method: "PUT", body: JSON.stringify(input) },
            "Error creating abstract wallet. Please contact support",
            user.jwt
        );
    }

    async getSmartWalletConfig(
        user: UserParams,
        chain: SmartWalletChain
    ): Promise<{
        kernelVersion: string;
        entryPointVersion: string;
        userId: string;
        existingSignerConfig?: SignerData;
        smartContractWalletAddress?: string;
    }> {
        const { signers, ...data } = await this.fetchCrossmintAPI(
            `${API_VERSION}/sdk/smart-wallet/config?chain=${chain}`,
            { method: "GET" },
            "Error getting smart wallet version configuration. Please contact support",
            user.jwt
        );

        if (signers.length === 0) {
            return { ...data, signer: undefined };
        }

        if (signers.length > 1) {
            throw new CrossmintServiceError("Invalid wallet signer configuration. Please contact support");
        }

        return { ...data, existingSignerConfig: signers[0].signerData };
    }

    async fetchNFTs(address: string, chain: SmartWalletChain) {
        return this.fetchCrossmintAPI(
            `v1-alpha1/wallets/${chain}:${address}/nfts`,
            { method: "GET" },
            `Error fetching NFTs for wallet: ${address}`
        );
    }

    public getPasskeyServerUrl(): string {
        return this.crossmintBaseUrl + "/internal/passkeys";
    }
}
