import { CrossmintWalletService } from "@/api";
import { EVMSmartWallet } from "@/blockchain";
import type { UserParams, WalletConfig } from "@/types";
import { CURRENT_VERSION, ZERO_DEV_TYPE, createOwnerSigner } from "@/utils";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createKernelAccount } from "@zerodev/sdk";
import { EntryPoint, EntryPointVersion } from "permissionless/types/entrypoint";
import { HttpTransport, PublicClient } from "viem";

import { EVMBlockchainIncludingTestnet, blockchainToChainId } from "@crossmint/common-sdk-base";

export default class EOAWalletService {
    constructor(private readonly crossmintService: CrossmintWalletService) {}

    public async getOrCreate({
        user,
        chain,
        publicClient,
        entryPoint,
        entryPointVersion,
        config,
    }: {
        user: UserParams;
        chain: EVMBlockchainIncludingTestnet;
        publicClient: PublicClient<HttpTransport>;
        entryPoint: EntryPoint;
        entryPointVersion: EntryPointVersion;
        config: WalletConfig;
    }) {
        const eoa = await createOwnerSigner({
            chain,
            walletConfig: config,
        });
        const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
            signer: eoa,
            entryPoint,
        });
        const account = await createKernelAccount(publicClient, {
            plugins: {
                sudo: ecdsaValidator,
            },
            index: BigInt(0),
            entryPoint,
        });

        const wallet = new EVMSmartWallet(this.crossmintService, account, publicClient, chain);
        await this.crossmintService.storeAbstractWallet({
            userIdentifier: { type: "whiteLabel", userId: user.id },
            type: ZERO_DEV_TYPE,
            smartContractWalletAddress: account.address,
            signerData: { eoaAddress: eoa.address, type: "eoa" },
            version: CURRENT_VERSION,
            baseLayer: "evm",
            chainId: blockchainToChainId(chain),
            entryPointVersion,
        });

        return wallet;
    }
}
