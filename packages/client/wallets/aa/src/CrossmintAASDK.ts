import { CrossmintWalletService } from "@/api";
import { EVMAAWallet, getBundlerRPC } from "@/blockchain";
import { type CrossmintAASDKInitParams, WalletConfig } from "@/types";
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
    private readonly crossmintService: CrossmintWalletService;
    private readonly passkeyWalletService: PasskeyWalletService;
    private readonly eoaWalletService: EOAWalletService;

    private constructor({ apiKey }: CrossmintAASDKInitParams) {
        if (!validateAPIKey(apiKey).isValid) {
            throw new Error("API key invalid");
        }

        this.crossmintService = new CrossmintWalletService(apiKey);
        this.passkeyWalletService = new PasskeyWalletService(
            this.crossmintService,
            "X" // TODO move this somewhere else!
        );
        this.eoaWalletService = new EOAWalletService(this.crossmintService);
    }

    static init(params: CrossmintAASDKInitParams): CrossmintAASDK {
        return new CrossmintAASDK(params);
    }

    // Scenarios
    // The user already has a wallet (from "user" & "chain") but the wallet config doesn't match, we'll throw an error
    // The dev doesn't provide wallet config, create passkey wallet by default.
    public async getOrCreate(
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
            if (walletConfig?.type === "eoa") {
                wallet = await this.eoaWalletService.getOrCreate(userIdentifier, chain, publicClient, walletConfig);
            } else {
                wallet = await this.passkeyWalletService.getOrCreate(userIdentifier, chain, publicClient);
            }

            logInfo("[GET_OR_CREATE_WALLET] - FINISH", {
                service: SCW_SERVICE,
                userEmail: user.email!,
                chain,
                address: wallet.address,
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
