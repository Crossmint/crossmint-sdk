import { StoreAbstractWalletInput } from "@/types";

import { EVMBlockchainIncludingTestnet, UserIdentifierParams } from "@crossmint/common-sdk-base";

import { BaseCrossmintService } from "./BaseCrossmintService";

export { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export class CrossmintWalletService extends BaseCrossmintService {
    async createSessionKey(address: string | `0x${string}`) {
        return this.fetchCrossmintAPI(
            "unstable/wallets/aa/wallets/sessionkey",
            {
                method: "POST",
                body: JSON.stringify({ address }),
            },
            "Error creating the wallet. Please check the configuration parameters"
        );
    }

    async storeAbstractWallet(input: StoreAbstractWalletInput) {
        return this.fetchCrossmintAPI(
            "unstable/wallets/aa/wallets",
            { method: "POST", body: JSON.stringify(input) },
            "Error creating abstract wallet. Please contact support"
        );
    }

    async getAbstractWalletEntryPointVersion(
        userIdentifier: UserIdentifierParams,
        chain: EVMBlockchainIncludingTestnet
    ) {
        const identifier = userIdentifier.email
            ? `email=${encodeURIComponent(userIdentifier.email)}`
            : `userId=${userIdentifier.userId}`;

        return this.fetchCrossmintAPI(
            `v1-alpha1/wallets/entry-point-version?${identifier}&chain=${chain}`,
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
}
