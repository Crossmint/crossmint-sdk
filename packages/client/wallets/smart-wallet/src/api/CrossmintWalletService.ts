import { SignerData, StoreSmartWalletParams } from "@/types/API";
import type { UserParams } from "@/types/Config";
import { API_VERSION } from "@/utils/constants";

import type { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { BaseCrossmintService } from "./BaseCrossmintService";

export { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export class CrossmintWalletService extends BaseCrossmintService {
    async idempotentCreateSmartWallet(user: UserParams, input: StoreSmartWalletParams) {
        return this.fetchCrossmintAPI(
            `${API_VERSION}/sdk/smart-wallet`,
            { method: "POST", body: JSON.stringify(input) },
            "Error creating abstract wallet. Please contact support",
            user.jwt
        );
    }

    async getSmartWalletConfig(
        user: UserParams,
        chain: EVMBlockchainIncludingTestnet
    ): Promise<{
        kernelVersion: string;
        entryPointVersion: string;
        userId: string;
        signers: { signerData: SignerData }[];
        smartContractWalletAddress?: string;
    }> {
        return this.fetchCrossmintAPI(
            `${API_VERSION}/sdk/smart-wallet/config?chain=${chain}`,
            { method: "GET" },
            "Error getting smart wallet version configuration. Please contact support",
            user.jwt
        );
    }

    async fetchNFTs(address: string, chain: EVMBlockchainIncludingTestnet) {
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
