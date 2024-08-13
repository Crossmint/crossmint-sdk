import type { UserOperation } from "permissionless";
import type { EntryPoint, GetEntryPointVersion } from "permissionless/types/entrypoint";

import { blockchainToChainId } from "@crossmint/common-sdk-base";

import type { SmartWalletChain } from "../blockchain/chains";
import { CrossmintServiceError } from "../error";
import type { SmartWalletConfig, StoreSmartWalletParams } from "../types/api";
import type { UserParams } from "../types/config";
import { SmartWalletConfigSchema } from "../types/schema";
import { bigintsToHex, parseBigintAPIResponse } from "../utils/api";
import { API_VERSION } from "../utils/constants";
import { BaseCrossmintService } from "./BaseCrossmintService";

export class CrossmintWalletService extends BaseCrossmintService {
    async idempotentCreateSmartWallet(user: UserParams, input: StoreSmartWalletParams): Promise<void> {
        await this.fetchCrossmintAPI(
            `${API_VERSION}/sdk/smart-wallet`,
            { method: "PUT", body: JSON.stringify(input) },
            "Error creating abstract wallet. Please contact support",
            user.jwt
        );
    }

    async sponsorUserOperation<E extends EntryPoint>(
        user: UserParams,
        userOp: UserOperation<GetEntryPointVersion<E>>,
        entryPoint: E,
        chain: SmartWalletChain
    ): Promise<{ sponsorUserOpParams: UserOperation<GetEntryPointVersion<E>> }> {
        const chainId = blockchainToChainId(chain);
        const result = await this.fetchCrossmintAPI(
            `${API_VERSION}/sdk/paymaster`,
            { method: "POST", body: JSON.stringify({ userOp: bigintsToHex(userOp), entryPoint, chainId }) },
            "Error sponsoring user operation. Please contact support",
            user.jwt
        );
        return parseBigintAPIResponse(result);
    }

    async getSmartWalletConfig(user: UserParams, chain: SmartWalletChain): Promise<SmartWalletConfig> {
        const data: unknown = await this.fetchCrossmintAPI(
            `${API_VERSION}/sdk/smart-wallet/config?chain=${chain}`,
            { method: "GET" },
            "Error getting smart wallet version configuration. Please contact support",
            user.jwt
        );

        const result = SmartWalletConfigSchema.safeParse(data);
        if (result.success) {
            return result.data;
        }

        throw new CrossmintServiceError(
            `Invalid smart wallet config, please contact support. Details below:\n${result.error.toString()}`
        );
    }

    async fetchNFTs(address: string, chain: SmartWalletChain) {
        return this.fetchCrossmintAPI(
            `v1-alpha1/wallets/${chain}:${address}/nfts`,
            { method: "GET" },
            `Error fetching NFTs for wallet: ${address}`
        );
    }

    public getPasskeyServerUrl(): string {
        return this.crossmintBaseUrl + "/internal/passkeys";
    }
}
