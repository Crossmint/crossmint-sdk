import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createKernelAccount } from "@zerodev/sdk";

import { AdminMismatchError } from "../../error";
import type { AccountAndSigner, EOACreationParams } from "../../types/internal";
import { equalsIgnoreCase } from "../../utils/helpers";
import { createOwnerSigner } from "../../utils/signer";

export class EOAAccountBuilder {
    public async build({
        chain,
        publicClient,
        entryPoint,
        walletParams,
        kernelVersion,
        user,
        existingSignerConfig,
    }: EOACreationParams): Promise<AccountAndSigner> {
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
