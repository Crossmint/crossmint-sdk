import type { EVMSmartWalletChain, EVMSignerInput, WalletTypeToArgs, SolanaSignerInput } from "@crossmint/wallets-sdk";

type WalletType = Pick<WalletTypeToArgs, "evm-smart-wallet">;

export type GetOrCreateWalletProps = {
    type: keyof WalletType;
    args: {
        chain?: EVMSmartWalletChain;
        adminSigner?: EVMSignerInput | SolanaSignerInput;
        linkedUser?: string;
    };
};
