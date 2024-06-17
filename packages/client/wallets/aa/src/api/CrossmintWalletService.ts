import { CrossmintServiceUser, StoreAbstractWalletInput } from "@/types";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

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

    async getAbstractWalletEntryPointVersion(user: CrossmintServiceUser, chain: EVMBlockchainIncludingTestnet) {
        return this.fetchCrossmintAPI(
            `v1-alpha1/wallets/entry-point-version?userId=${user.userId}&chain=${chain}`,
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

    async getPasskeyValidatorSigner(user: CrossmintServiceUser): Promise<any> {
        console.log(`Fetching passkey validator signer for user ID: ${user.userId}`);
        const signers = await this.fetchCrossmintAPI(
            `unstable/wallets/aa/signers?userId=${user.userId}&type=passkeys`,
            { method: "GET" },
            "Error fetching passkey validator signer. Please contact support"
        );
        console.log(`Received signers: ${JSON.stringify(signers)}`);

        if (signers.length === 0) {
            console.error("Passkey validator signer not found");
            throw new Error("Passkey validator signer not found");
        }

        console.log(`Returning signer data: ${JSON.stringify(signers[0].signerData)}`);
        return signers[0].signerData;
    }
}
