import { CrossmintWalletService } from "@/api/CrossmintWalletService";
import type { EOASigner, WalletConfig } from "@/types/Config";
import { WalletCreationParams } from "@/types/internal";
import { CURRENT_VERSION, ZERO_DEV_TYPE } from "@/utils/constants";
import { createOwnerSigner } from "@/utils/signer";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createKernelAccount } from "@zerodev/sdk";

import { blockchainToChainId } from "@crossmint/common-sdk-base";

import { EVMSmartWallet } from "./EVMSmartWallet";

export interface EOAWalletParams extends WalletCreationParams {
    walletConfig: WalletConfig & { signer: EOASigner };
}

export class EOAWalletService {
    constructor(private readonly crossmintService: CrossmintWalletService) {}

    public async getOrCreate({ user, chain, publicClient, entrypoint, walletConfig, kernelVersion }: EOAWalletParams) {
        const eoa = await createOwnerSigner({
            chain,
            walletConfig,
        });
        const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
            signer: eoa,
            entryPoint: entrypoint.address,
            kernelVersion,
        });
        const account = await createKernelAccount(publicClient, {
            plugins: {
                sudo: ecdsaValidator,
            },
            index: BigInt(0),
            entryPoint: entrypoint.address,
            kernelVersion,
        });

        const wallet = new EVMSmartWallet(this.crossmintService, account, publicClient, chain);
        await this.crossmintService.storeSmartWallet(user, {
            type: ZERO_DEV_TYPE,
            smartContractWalletAddress: account.address,
            signerData: { eoaAddress: eoa.address, type: "eoa" },
            version: CURRENT_VERSION,
            baseLayer: "evm",
            chainId: blockchainToChainId(chain),
            entryPointVersion: entrypoint.version,
            kernelVersion,
        });

        return wallet;
    }
}
