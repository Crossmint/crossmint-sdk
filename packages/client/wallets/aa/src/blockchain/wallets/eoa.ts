import {
    CURRENT_VERSION,
    CrossmintWalletService,
    EOAWalletConfig,
    EVMAAWallet,
    WalletSdkError,
    ZERO_DEV_TYPE,
    createOwnerSigner,
} from "@/index";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createKernelAccount } from "@zerodev/sdk";
import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { EntryPointVersion } from "permissionless/_types/types";
import { HttpTransport, PublicClient } from "viem";

import {
    EVMBlockchainIncludingTestnet,
    UserIdentifier,
    UserIdentifierParams,
    blockchainToChainId,
} from "@crossmint/common-sdk-base";

// TODO figure out if that session key stuff worked, if yes, add it back.
export default class EOAWalletService {
    constructor(private readonly crossmintService: CrossmintWalletService) {}

    public async getOrCreate(
        userIdentifier: UserIdentifier,
        chain: EVMBlockchainIncludingTestnet,
        publicClient: PublicClient<HttpTransport>,
        walletConfig: EOAWalletConfig
    ) {
        // TODO
        // Fetch wallet for userIdentifier
        // If there's an inconsistency, throw an error

        const entryPointVersion = await this.getEntryPointVersion(userIdentifier, chain);
        const entryPoint = entryPointVersion === "v0.6" ? ENTRYPOINT_ADDRESS_V06 : ENTRYPOINT_ADDRESS_V07;

        const owner = await createOwnerSigner({
            chain,
            walletConfig,
        });
        const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
            signer: owner,
            entryPoint,
        });

        const account = await createKernelAccount(publicClient, {
            plugins: {
                sudo: ecdsaValidator,
            },
            index: BigInt(0),
            entryPoint,
        });

        const wallet = new EVMAAWallet(account, this.crossmintService, chain, publicClient, entryPoint);
        await this.crossmintService.storeAbstractWallet({
            userIdentifier: userIdentifier,
            type: ZERO_DEV_TYPE,
            smartContractWalletAddress: wallet.address,
            eoaAddress: owner.address,
            sessionKeySignerAddress: "n/a", // TODO
            version: CURRENT_VERSION,
            baseLayer: "evm",
            chainId: blockchainToChainId(chain),
            entryPointVersion,
        });

        return wallet;
    }

    private async getEntryPointVersion(
        userIdentifier: UserIdentifierParams,
        chain: EVMBlockchainIncludingTestnet
    ): Promise<EntryPointVersion> {
        if (userIdentifier.email == null && userIdentifier.userId == null) {
            throw new WalletSdkError(`Email or userId is required to get the entry point version`);
        }

        const { entryPointVersion } = await this.crossmintService.getAbstractWalletEntryPointVersion(
            userIdentifier,
            chain
        );
        return entryPointVersion;
    }
}
