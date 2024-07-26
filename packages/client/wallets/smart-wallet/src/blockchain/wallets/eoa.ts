import { EOASignerData } from "@/types/API";
import type { EOASigner, WalletParams } from "@/types/Config";
import { AccountAndSigner, WalletCreationParams } from "@/types/internal";
import { createOwnerSigner } from "@/utils/signer";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createKernelAccount } from "@zerodev/sdk";

export interface EOAWalletParams extends WalletCreationParams {
    walletParams: WalletParams & { signer: EOASigner };
}

export class EOAAccountService {
    public async get(
        { chain, publicClient, entryPoint, walletParams, kernelVersion }: EOAWalletParams,
        existingSignerConfig?: EOASignerData
    ): Promise<AccountAndSigner> {
        const eoa = await createOwnerSigner({
            chain,
            walletParams,
        });

        if (existingSignerConfig != null && eoa.address !== existingSignerConfig.eoaAddress) {
            throw new Error("Ahhhhhhh");
        }

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
