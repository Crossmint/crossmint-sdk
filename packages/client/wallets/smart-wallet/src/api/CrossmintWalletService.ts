import { PasskeySignerData, StoreSmartWalletParams } from "@/types/API";
import type { UserParams } from "@/types/Config";
import { CrossmintServiceError, SmartWalletSDKError } from "@/types/Error";

import type { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { BaseCrossmintService } from "./BaseCrossmintService";

export { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export class CrossmintWalletService extends BaseCrossmintService {
    async storeSmartWallet(user: UserParams, input: StoreSmartWalletParams) {
        return this.fetchCrossmintAPI(
            "sdk/smart-wallet",
            { method: "POST", body: JSON.stringify(input) },
            "Error creating abstract wallet. Please contact support",
            user.jwt
        );
    }

    async getSmartWalletConfig(user: UserParams, chain: EVMBlockchainIncludingTestnet) {
        return this.fetchCrossmintAPI(
            `sdk/smart-wallet/versions?chain=${chain}`,
            { method: "GET" },
            "Error getting smart wallet version configuration. Please contact support",
            user.jwt
        );
    }

    async getPasskeySigner(user: UserParams): Promise<PasskeySignerData | null> {
        const errorMessage = "Error fetching passkey validator signer. Please contact support";
        const signers = await this.fetchCrossmintAPI(
            "sdk/smart-wallet/signers?type=passkeys",
            { method: "GET" },
            errorMessage,
            user.jwt
        );

        if (signers.length === 0) {
            return null;
        }

        if (signers.length > 1) {
            throw new CrossmintServiceError(errorMessage);
        }

        return signers[0].signerData;
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
