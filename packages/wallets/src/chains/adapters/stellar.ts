import type { Chain } from "../chains";
import type { RegisterSignerResponse } from "../../api";
import type { TokenBalance, PendingSignerOperation } from "../../wallets/types";
import { walletsLogger } from "../../logger";
import type { AddSignerChain, ChainAdapter } from "../chain-adapter";

export const stellarChainAdapter: ChainAdapter = {
    nativeToken: "xlm",
    walletLocatorPrefix: "me:stellar:smart",
    supportsSignatures: true,

    addSignerChain(_chain: Chain): AddSignerChain | undefined {
        return undefined;
    },

    extractAddSignerOperation(response: RegisterSignerResponse, _chain: Chain): PendingSignerOperation | null {
        if (!("transaction" in response) || response.transaction == null) {
            return null;
        }
        return { type: "transaction", id: response.transaction.id };
    },

    assertAddSignerSucceeded(
        response: RegisterSignerResponse,
        _chain: Chain,
        _signerLocator: string,
        _signerType: string
    ): void {
        if (!("transaction" in response) || response.transaction == null) {
            walletsLogger.error("wallet.addSigner.error", {
                error: "Expected transaction in response for Solana/Stellar chain",
            });
            throw new Error("Expected transaction in response for Solana/Stellar chain");
        }
    },

    balanceTokenFields(chainData: unknown): Partial<TokenBalance> {
        if (chainData != null && "contractId" in (chainData as object)) {
            return { contractId: (chainData as { contractId?: string }).contractId };
        }
        if (chainData != null && "contractAddress" in (chainData as object)) {
            return {
                contractAddress: (chainData as { contractAddress?: unknown }).contractAddress,
            } as Partial<TokenBalance>;
        }
        return {};
    },

    emptyBalanceTokenFields(): Partial<TokenBalance> {
        return { contractId: undefined };
    },
};
