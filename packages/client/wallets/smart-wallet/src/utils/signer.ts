import { providerToSmartAccountSigner } from "permissionless";
import type { SmartAccountSigner } from "permissionless/accounts";
import { Address, EIP1193Provider } from "viem";

import { SmartWalletChain } from "../blockchain/chains";
import { SmartWalletSDKError } from "../error";
import { ViemAccount, WalletParams } from "../types/Config";
import { logInputOutput } from "./log";

type CreateOwnerSignerInput = {
    chain: SmartWalletChain;
    walletParams: WalletParams;
};

export const createOwnerSigner = logInputOutput(
    async ({ walletParams }: CreateOwnerSignerInput): Promise<SmartAccountSigner<"custom", Address>> => {
        if (isEIP1193Provider(walletParams.signer)) {
            return await providerToSmartAccountSigner(walletParams.signer);
        } else if (isAccount(walletParams.signer)) {
            return walletParams.signer.account;
        } else {
            const signer = walletParams.signer as any;
            throw new SmartWalletSDKError(`The signer type ${signer.type} is not supported`);
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
