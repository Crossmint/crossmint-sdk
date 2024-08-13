import type { AccountAndSigner, EOACreationParams } from "@/types/internal";
import { equalsIgnoreCase } from "@/utils/helpers";
import { createOwnerSigner } from "@/utils/signer";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createKernelAccount } from "@zerodev/sdk";

import { AdminMismatchError } from "../../../error";
import { EOASignerConfig } from "./signer";
import { AccountCreationStrategy } from "./strategy";

export class EOACreationStrategy implements AccountCreationStrategy {
    public async create({
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

        if (existingSignerConfig != null && !equalsIgnoreCase(eoa.address, existingSignerConfig.data.eoaAddress)) {
            throw new AdminMismatchError(
                `User '${user.id}' has an existing wallet with an eoa signer '${existingSignerConfig.data.eoaAddress}', this does not match input eoa signer '${eoa.address}'.`,
                existingSignerConfig.display(),
                { type: "eoa", eoaAddress: existingSignerConfig.data.eoaAddress }
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

        return { account, signerConfig: new EOASignerConfig({ eoaAddress: eoa.address, type: "eoa" }) };
    }
}
