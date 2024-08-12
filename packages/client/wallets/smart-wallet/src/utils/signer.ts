import { providerToSmartAccountSigner } from "permissionless";
import type { SmartAccountSigner } from "permissionless/accounts";
import { Address, EIP1193Provider } from "viem";

import { SmartWalletChain } from "../blockchain/chains";
import { SmartWalletError } from "../error";
import { ViemAccount, WalletParams } from "../types/Config";

type CreateOwnerSignerInput = {
    chain: SmartWalletChain;
    walletParams: WalletParams;
};

export async function createOwnerSigner({
    walletParams,
}: CreateOwnerSignerInput): Promise<SmartAccountSigner<"custom", Address>> {
    if (isEIP1193Provider(walletParams.signer)) {
        return await providerToSmartAccountSigner(walletParams.signer);
    } else if (isAccount(walletParams.signer)) {
        return walletParams.signer.account;
    } else {
        const signer = walletParams.signer as any;
        throw new SmartWalletError(`The signer type ${signer.type} is not supported`);
    }
}

function isEIP1193Provider(signer: any): signer is EIP1193Provider {
    return signer && typeof signer.request === "function";
}

export function isAccount(signer: any): signer is ViemAccount {
    return signer && signer.type === "VIEM_ACCOUNT";
}
