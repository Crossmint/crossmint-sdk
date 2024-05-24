import { CrossmintWalletService } from "@/api";
import { EVMAAWallet, getBundlerRPC } from "@/blockchain";
import { type CrossmintAASDKInitParams, WalletConfig, isEOAWalletConfig } from "@/types";
import { SCW_SERVICE, WalletSdkError, errorToJSON } from "@/utils";
import { createPublicClient, http } from "viem";

import {
    EVMBlockchainIncludingTestnet,
    UserIdentifierParams,
    isEVMBlockchain,
    validateAPIKey,
} from "@crossmint/common-sdk-base";

import EOAWalletService from "./blockchain/wallets/eoa";
import PasskeyWalletService from "./blockchain/wallets/passkey";
import { logError, logInfo } from "./services/logging";
import { parseUserIdentifier } from "./utils/user";

export class CrossmintAASDK {
    private readonly passkeyWalletService: PasskeyWalletService;
    private readonly eoaWalletService: EOAWalletService;

    private constructor({ apiKey }: CrossmintAASDKInitParams) {
        const result = validateAPIKey(apiKey);
        if (!result.isValid) {
            throw new Error("API key invalid");
        }

        const crossmintService = new CrossmintWalletService(apiKey);
        this.passkeyWalletService = new PasskeyWalletService(crossmintService, result.projectId);
        this.eoaWalletService = new EOAWalletService(crossmintService);
    }

    static init(params: CrossmintAASDKInitParams): CrossmintAASDK {
        return new CrossmintAASDK(params);
    }

    /**
     * Retrieves an existing wallet or creates a new one based on the provided parameters.
     * - If a wallet does not exist for the given user and no `walletConfig` is provided, a passkey signer will be created by default.
     * - If a wallet for a user already exists and `walletConfig` is provided, but the wallet and config do not match, an error will be thrown.
     *
     * @param {UserIdentifierParams} user - The user identifier parameters.
     * @param {EVMBlockchainIncludingTestnet} chain - The blockchain type, including testnets.
     * @param {WalletConfig} [walletConfig] - Optional configuration for the wallet, if specific wallet type needs to be created or validated.
     * @returns {Promise<EVMAAWallet>} The wallet instance, either fetched or newly created.
     */
    public async getOrCreateWallet(
        user: UserIdentifierParams,
        chain: EVMBlockchainIncludingTestnet,
        walletConfig?: WalletConfig
    ) {
        try {
            logInfo("[GET_OR_CREATE_WALLET] - INIT", {
                service: SCW_SERVICE,
                user,
                chain,
            });

            if (!isEVMBlockchain(chain)) {
                throw new WalletSdkError(`The blockchain ${chain} is not supported`);
            }

            const publicClient = createPublicClient({
                transport: http(getBundlerRPC(chain)),
            });
            const userIdentifier = parseUserIdentifier(user);

            let wallet: EVMAAWallet;
            if (walletConfig != null && isEOAWalletConfig(walletConfig)) {
                wallet = await this.eoaWalletService.getOrCreate(userIdentifier, chain, publicClient, walletConfig);
            } else {
                wallet = await this.passkeyWalletService.getOrCreate(userIdentifier, chain, publicClient, walletConfig);
            }

            logInfo("[GET_OR_CREATE_WALLET] - FINISH", {
                service: SCW_SERVICE,
                userEmail: user.email!,
                chain,
                address: wallet.getAddress(),
            });
            return wallet;
        } catch (error: any) {
            logError("[GET_OR_CREATE_WALLET] - ERROR_CREATING_WALLET", {
                service: SCW_SERVICE,
                error: errorToJSON(error),
                user,
                chain,
            });

            throw new WalletSdkError(`Error creating the Wallet ${error?.message ? `: ${error.message}` : ""}`);
        }
    }
}
