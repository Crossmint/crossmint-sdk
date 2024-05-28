import { CrossmintWalletService } from "@/api";
import { EVMAAWallet, getBundlerRPC } from "@/blockchain";
import type { CrossmintAASDKInitParams, WalletConfig } from "@/types";
import { CURRENT_VERSION, WalletSdkError, ZERO_DEV_TYPE, createOwnerSigner } from "@/utils";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createKernelAccount } from "@zerodev/sdk";
import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { EntryPointVersion } from "permissionless/types/entrypoint";
import { createPublicClient, http } from "viem";

import {
    EVMBlockchainIncludingTestnet,
    UserIdentifierParams,
    blockchainToChainId,
    isEVMBlockchain,
    validateAPIKey,
} from "@crossmint/common-sdk-base";

import { LoggerWrapper, logPerformance } from "./utils/log";
import { parseUserIdentifier } from "./utils/user";

export class CrossmintAASDK extends LoggerWrapper {
    crossmintService: CrossmintWalletService;

    private constructor(config: CrossmintAASDKInitParams) {
        super("CrossmintAASDK");
        const validationResult = validateAPIKey(config.apiKey);
        if (!validationResult.isValid) {
            throw new Error("API key invalid");
        }

        this.crossmintService = new CrossmintWalletService(config.apiKey);
    }

    static init(params: CrossmintAASDKInitParams): CrossmintAASDK {
        return new CrossmintAASDK(params);
    }

    async getOrCreateWallet(
        user: UserIdentifierParams,
        chain: EVMBlockchainIncludingTestnet,
        walletConfig: WalletConfig
    ) {
        return logPerformance(
            "GET_OR_CREATE_WALLET",
            async () => {
                try {
                    if (!isEVMBlockchain(chain)) {
                        throw new WalletSdkError(`The blockchain ${chain} is not supported`);
                    }

                    const userIdentifier = parseUserIdentifier(user);

                    const entryPointVersion = await this.getEntryPointVersion(userIdentifier, chain);
                    const entryPoint = entryPointVersion === "v0.6" ? ENTRYPOINT_ADDRESS_V06 : ENTRYPOINT_ADDRESS_V07;

                    const owner = await createOwnerSigner({
                        chain,
                        walletConfig,
                    });

                    const address = owner.address;

                    const publicClient = createPublicClient({
                        transport: http(getBundlerRPC(chain)),
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

                    const evmAAWallet = new EVMAAWallet(
                        account,
                        this.crossmintService,
                        chain,
                        publicClient,
                        ecdsaValidator,
                        entryPoint
                    );

                    const abstractAddress = account.address;
                    const { sessionKeySignerAddress } = await this.crossmintService.createSessionKey(abstractAddress);

                    evmAAWallet.setSessionKeySignerAddress(sessionKeySignerAddress);

                    await this.crossmintService.storeAbstractWallet({
                        userIdentifier,
                        type: ZERO_DEV_TYPE,
                        smartContractWalletAddress: abstractAddress,
                        eoaAddress: address,
                        sessionKeySignerAddress,
                        version: CURRENT_VERSION,
                        baseLayer: "evm",
                        chainId: blockchainToChainId(chain),
                        entryPointVersion,
                    });

                    return evmAAWallet;
                } catch (error: any) {
                    throw new WalletSdkError(`Error creating the Wallet ${error?.message ? `: ${error.message}` : ""}`);
                }
            },
            { user, chain }
        );
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
