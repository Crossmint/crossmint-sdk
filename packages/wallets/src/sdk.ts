import type { Crossmint } from "@crossmint/common-sdk-base";

import type { EVMSmartWallet, EVMMPCWallet } from "@/evm";
import type { SolanaSmartWallet, SolanaMPCWallet } from "@/solana";
import type { CreateWalletDto } from "@/api/gen/types.gen";

import { ApiClient } from "./api/index.js";

type EVMAdminSigner = NonNullable<Extract<CreateWalletDto, { type: "evm-smart-wallet" }>["config"]>["adminSigner"];
type SolanaAdminSigner = NonNullable<
    Extract<CreateWalletDto, { type: "solana-smart-wallet" }>["config"]
>["adminSigner"];

type WalletTypeToArgs = {
    "evm-smart-wallet": [adminSigner: EVMAdminSigner, linkedUser?: string];
    "evm-mpc-wallet": [linkedUser: string];
    "solana-smart-wallet": [adminSigner: SolanaAdminSigner, linkedUser?: string];
    "solana-mpc-wallet": [linkedUser: string];
};

type WalletTypeToWallet = {
    "evm-smart-wallet": EVMSmartWallet;
    "evm-mpc-wallet": EVMMPCWallet;
    "solana-smart-wallet": SolanaSmartWallet;
    "solana-mpc-wallet": SolanaMPCWallet;
};

class CrossmintWallet {
    private apiClient: ApiClient;

    private constructor(crossmint: Crossmint) {
        this.apiClient = new ApiClient(crossmint);
    }

    public static from(crossmint: Crossmint): CrossmintWallet {
        return new CrossmintWallet(crossmint);
    }

    // biome-ignore lint/suspicious/useAwait: stub
    public async getOrCreateWallet<WalletType extends keyof WalletTypeToArgs>(
        _type: WalletType,
        ..._args: WalletTypeToArgs[WalletType]
    ): Promise<WalletTypeToWallet[WalletType]> {
        // if (type === "evm-smart-wallet") {
        //     const [adminSigner, linkedUser] =
        //         args as WalletTypeToArgs["evm-smart-wallet"];
        //     return new EVMSmartWallet();
        // }
        throw new Error("Not implemented");
    }
}

export default CrossmintWallet;
