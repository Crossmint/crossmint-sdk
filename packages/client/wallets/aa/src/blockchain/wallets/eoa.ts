import { CrossmintWalletService } from "@/api";
import { EVMSmartWallet } from "@/blockchain";
import type { EOASigner, WalletConfig } from "@/types";
import { WalletCreationParams } from "@/types/internal";
import { CURRENT_VERSION, ZERO_DEV_TYPE, createOwnerSigner } from "@/utils";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createKernelAccount } from "@zerodev/sdk";

import { blockchainToChainId } from "@crossmint/common-sdk-base";

export interface EOAWalletParams extends WalletCreationParams {
    walletConfig: WalletConfig & { signer: EOASigner };
}

export class EOAWalletService {
    constructor(private readonly crossmintService: CrossmintWalletService) {}

    public async getOrCreate({ userIdentifier, chain, publicClient, entrypoint, walletConfig }: EOAWalletParams) {
        const eoa = await createOwnerSigner({
            chain,
            walletConfig,
        });
        const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
            signer: eoa,
            entryPoint: entrypoint.address,
        });
        const account = await createKernelAccount(publicClient, {
            plugins: {
                sudo: ecdsaValidator,
            },
            index: BigInt(0),
            entryPoint: entrypoint.address,
        });

        const wallet = new EVMSmartWallet(this.crossmintService, account, publicClient, chain);
        await this.crossmintService.storeAbstractWallet({
            userIdentifier,
            type: ZERO_DEV_TYPE,
            smartContractWalletAddress: account.address,
            signerData: { eoaAddress: eoa.address, type: "eoa" },
            version: CURRENT_VERSION,
            baseLayer: "evm",
            chainId: blockchainToChainId(chain),
            entryPointVersion: entrypoint.version,
        });

        return wallet;
    }
}
