import { providerToSmartAccountSigner } from "permissionless";
import type { SmartAccountSigner } from "permissionless/accounts";
import { Address, EIP1193Provider } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { ViemAccount, WalletConfig } from "../types/Config";
import { WalletSdkError } from "../types/Error";
import { logInputOutput } from "./log";

type CreateOwnerSignerInput = {
    chain: EVMBlockchainIncludingTestnet;
    walletConfig: WalletConfig;
};

export const createOwnerSigner = logInputOutput(
    async ({ walletConfig }: CreateOwnerSignerInput): Promise<SmartAccountSigner<"custom", Address>> => {
        if (isEIP1193Provider(walletConfig.signer)) {
            return await providerToSmartAccountSigner(walletConfig.signer);
        } else if (isAccount(walletConfig.signer)) {
            return walletConfig.signer.account;
        } else {
            const signer = walletConfig.signer as any;
            throw new WalletSdkError(`The signer type ${signer.type} is not supported`);
        }
    },
    "createOwnerSigner"
);

function isEIP1193Provider(signer: any): signer is EIP1193Provider {
    return signer && typeof signer.request === "function";
}

export function isAccount(signer: any): signer is ViemAccount {
    return signer && signer.type === "VIEM_ACCOUNT";
}
