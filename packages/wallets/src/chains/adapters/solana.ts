import type { RegisterSignerResponse } from "../../api";
import { walletsLogger } from "../../logger";
import type { PendingSignerOperation, TokenBalance } from "../../wallets/types";
import type { AddSignerChain, ChainAdapter } from "../chain-adapter";
import type { Chain } from "../chains";

export const solanaChainAdapter: ChainAdapter = {
    nativeToken: "sol",
    walletLocatorPrefix: "me:solana:smart",
    supportsSignatures: false,

    addSignerChain(_chain: Chain): AddSignerChain | undefined {
        return undefined;
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

    extractAddSignerOperation(response: RegisterSignerResponse, _chain: Chain): PendingSignerOperation | null {
        if (!("transaction" in response) || response.transaction == null) {
            return null;
        }
        return { type: "transaction", id: response.transaction.id };
    },

    balanceTokenFields(chainData: unknown): Partial<TokenBalance> {
        if (chainData != null && "mintHash" in (chainData as object)) {
            return { mintHash: (chainData as { mintHash?: string }).mintHash };
        }
        if (chainData != null && "contractAddress" in (chainData as object)) {
            return {
                contractAddress: (chainData as { contractAddress?: unknown }).contractAddress,
            } as Partial<TokenBalance>;
        }
        return {};
    },

    emptyBalanceTokenFields(): Partial<TokenBalance> {
        return { mintHash: undefined };
    },
};
