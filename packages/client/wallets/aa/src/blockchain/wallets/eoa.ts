import type { EOASigner, WalletConfig } from "@/types/Config";
import { AccountAndSigner, WalletCreationParams } from "@/types/internal";
import { createOwnerSigner } from "@/utils/signer";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createKernelAccount } from "@zerodev/sdk";

export interface EOAWalletParams extends WalletCreationParams {
    walletConfig: WalletConfig & { signer: EOASigner };
}

export class EOAWalletService {
    public async getAccount({
        chain,
        publicClient,
        entryPoint,
        walletConfig,
        kernelVersion,
    }: EOAWalletParams): Promise<AccountAndSigner> {
        const eoa = await createOwnerSigner({
            chain,
            walletConfig,
        });
        const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
            signer: eoa,
            entryPoint: entryPoint.address,
            kernelVersion,
        });
        const account = await createKernelAccount(publicClient, {
            plugins: {
                sudo: ecdsaValidator,
            },
            index: BigInt(0),
            entryPoint: entryPoint.address,
            kernelVersion,
        });

        return { account, signerData: { eoaAddress: eoa.address, type: "eoa" } };
    }
}
