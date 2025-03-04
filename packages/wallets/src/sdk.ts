import type { Crossmint } from "@crossmint/common-sdk-base";
import type { Address } from "viem";

import { EVMSmartWallet, type EVMMPCWallet, type EVMSmartWalletChain, type EVMSigner } from "@/evm";
import type { SolanaSmartWallet, SolanaMPCWallet, SolanaSigner } from "@/solana";

import { ApiClient } from "./api/index.js";

type WalletTypeToArgs = {
    "evm-smart-wallet": [chain: EVMSmartWalletChain, adminSigner: EVMSigner, linkedUser?: string];
    "evm-mpc-wallet": [chain: EVMSmartWalletChain, linkedUser: string];
    "solana-smart-wallet": [adminSigner: SolanaSigner, linkedUser?: string];
    "solana-mpc-wallet": [linkedUser: string];
};

type WalletTypeToWallet = {
    "evm-smart-wallet": EVMSmartWallet;
    "evm-mpc-wallet": EVMMPCWallet;
    "solana-smart-wallet": SolanaSmartWallet;
    "solana-mpc-wallet": SolanaMPCWallet;
};

export class CrossmintWallet {
    private apiClient: ApiClient;

    private constructor(crossmint: Crossmint) {
        this.apiClient = new ApiClient(crossmint);
    }

    public static from(crossmint: Crossmint): CrossmintWallet {
        return new CrossmintWallet(crossmint);
    }

    public async getOrCreateWallet<WalletType extends keyof WalletTypeToArgs>(
        type: WalletType,
        ...args: WalletTypeToArgs[WalletType]
    ): Promise<WalletTypeToWallet[WalletType]> {
        if (type === "evm-smart-wallet") {
            const [chain, adminSigner, linkedUser] = args as WalletTypeToArgs["evm-smart-wallet"];
            const walletResponse = await this.apiClient.createWallet({
                type: "evm-smart-wallet",
                config: {
                    adminSigner,
                },
                linkedUser,
            });
            return new EVMSmartWallet(
                chain,
                this.apiClient,
                walletResponse.address as Address,
                adminSigner
            ) as WalletTypeToWallet[WalletType];
        }
        throw new Error("Not implemented");
    }
}
