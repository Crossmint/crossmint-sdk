import { EOASignerData } from "@/types/API";
import type { EOASigner, WalletParams } from "@/types/Config";
import { AccountAndSigner, WalletCreationParams } from "@/types/internal";
import { equalsIgnoreCase } from "@/utils/helpers";
import { createOwnerSigner } from "@/utils/signer";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createKernelAccount } from "@zerodev/sdk";

import { AdminMismatchError } from "../../error";

export interface EOAWalletParams extends WalletCreationParams {
    walletParams: WalletParams & { signer: EOASigner };
}

export class EOAAccountService {
    public async get(
        { chain, publicClient, entryPoint, walletParams, kernelVersion, user }: EOAWalletParams,
        existingSignerConfig?: EOASignerData
    ): Promise<AccountAndSigner> {
        const eoa = await createOwnerSigner({
            chain,
            walletParams,
        });

        if (existingSignerConfig != null && !equalsIgnoreCase(eoa.address, existingSignerConfig.eoaAddress)) {
            throw new AdminMismatchError(
                `User '${user.id}' has an existing wallet with an eoa signer '${existingSignerConfig.eoaAddress}', this does not match input eoa signer '${eoa.address}'.`,
                existingSignerConfig,
                { type: "eoa", eoaAddress: existingSignerConfig.eoaAddress }
            );
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
