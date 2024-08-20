import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createKernelAccount } from "@zerodev/sdk";

import { AdminMismatchError } from "../../../error";
import type { AccountAndSigner, EOACreationContext } from "../../../types/internal";
import { equalsIgnoreCase } from "../../../utils/helpers";
import { createOwnerSigner } from "../../../utils/signer";
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
        existing,
    }: EOACreationContext): Promise<AccountAndSigner> {
        const eoa = await createOwnerSigner({
            chain,
            walletParams,
        });

        if (existing != null && !equalsIgnoreCase(eoa.address, existing.signerConfig.data.eoaAddress)) {
            throw new AdminMismatchError(
                `User '${user.id}' has an existing wallet with an eoa signer '${existing.signerConfig.data.eoaAddress}', this does not match input eoa signer '${eoa.address}'.`,
                existing.signerConfig.display(),
                { type: "eoa", eoaAddress: existing.signerConfig.data.eoaAddress }
            );
        }

        const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
            signer: eoa,
            entryPoint,
            kernelVersion,
        });
        const account = await createKernelAccount(publicClient, {
            plugins: {
                sudo: ecdsaValidator,
            },
            index: 0n,
            entryPoint,
            kernelVersion,
        });

        return { account, signerConfig: new EOASignerConfig({ eoaAddress: eoa.address, type: "eoa" }) };
    }
}
