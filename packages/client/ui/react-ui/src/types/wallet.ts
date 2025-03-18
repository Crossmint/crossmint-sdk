import type { EVMSmartWalletChain } from "@crossmint/wallets-sdk/dist/evm/chains";
import type { EVMSignerInput } from "@crossmint/wallets-sdk/dist/evm/wallet";
import type { WalletTypeToArgs } from "@crossmint/wallets-sdk/dist/services/types";
import type { SolanaSignerInput } from "@crossmint/wallets-sdk/dist/solana/types/signers";

type WalletType = keyof WalletTypeToArgs;

export type GetOrCreateWalletProps = {
    type: WalletType;
    args: {
        chain?: EVMSmartWalletChain;
        adminSigner?: EVMSignerInput | SolanaSignerInput;
        linkedUser?: string;
    };
};
