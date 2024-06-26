import type { SignerData, StoreAbstractWalletInput, UserIdentifier, UserIdentifierParams } from "@/types";

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

    async getPasskeyValidatorSigner(user: UserIdentifier): Promise<SignerData | null> {
        try {
            const signers = await this.fetchCrossmintAPI(
                `unstable/wallets/aa/signers?${user}&type=passkeys`,
                { method: "GET" },
                "Error fetching passkey validator signer. Please contact support"
            );

            console.log(`Received signers: ${JSON.stringify(signers)}`);
            if (signers.length === 0) {
                return null;
            }

            console.log(`Returning signer data: ${JSON.stringify(signers[0].signerData)}`);
            return signers[0].signerData;
        } catch (e: any) {
            if (e.message.includes("Wallet not found")) {
                return null;
            }

            throw e;
        }
    }
}
