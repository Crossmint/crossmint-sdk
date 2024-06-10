import { CrossmintWalletService } from "@/api";
import { getBundlerRPC } from "@/blockchain";
import type { SmartWalletSDKInitParams, WalletConfig } from "@/types";
import { WalletSdkError } from "@/utils";
import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { EntryPointVersion } from "permissionless/types/entrypoint";
import { createPublicClient, http } from "viem";

import { EVMBlockchainIncludingTestnet, UserIdentifierParams, validateAPIKey } from "@crossmint/common-sdk-base";

import EOAWalletService from "./blockchain/wallets/eoa";
import { LoggerWrapper, logPerformance } from "./utils/log";
import { parseUserIdentifier } from "./utils/user";

export class SmartWalletSDK extends LoggerWrapper {
    private readonly crossmintService: CrossmintWalletService;
    private readonly eaoWalletService: EOAWalletService;

    private constructor(config: SmartWalletSDKInitParams) {
        super("SmartWalletSDK");
        const validationResult = validateAPIKey(config.apiKey);
        if (!validationResult.isValid) {
            throw new Error("API key invalid");
        }

        this.crossmintService = new CrossmintWalletService(config.apiKey);
        this.eaoWalletService = new EOAWalletService(this.crossmintService);
    }

    static init(params: SmartWalletSDKInitParams): SmartWalletSDK {
        return new SmartWalletSDK(params);
    }

    async getOrCreate(user: UserIdentifierParams, chain: EVMBlockchainIncludingTestnet, walletConfig: WalletConfig) {
        return logPerformance(
            "GET_OR_CREATE_WALLET",
            async () => {
                try {
                    const userIdentifier = parseUserIdentifier(user);
                    const entryPointVersion = await this.getEntryPointVersion(userIdentifier, chain);
                    return this.eaoWalletService.getOrCreate({
                        userIdentifier,
                        chain,
                        publicClient: createPublicClient({
                            transport: http(getBundlerRPC(chain)),
                        }),
                        entryPointVersion,
                        entryPoint: entryPointVersion === "v0.6" ? ENTRYPOINT_ADDRESS_V06 : ENTRYPOINT_ADDRESS_V07,
                        walletConfig,
                    });
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
