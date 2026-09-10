import base58 from "bs58";
import type { GetTransactionSuccessResponse, RegisterSignerResponse } from "../../api";
import type { SignerAdapter } from "../../signers/types";
import { walletsLogger } from "../../logger";
import type { PendingSignerOperation, TokenBalance } from "../../wallets/types";
import type { AddSignerChain, AddSignerContext, ChainAdapter } from "../chain-adapter";
import type { Chain } from "../chains";

/**
 * A versioned message sets the high bit of its first byte; the low seven bits hold the version.
 * A payload we cannot read is not a version-1 message, so signing reports the real problem.
 */
function isVersion1Message(approvalMessage: string): boolean {
    let prefix: number | undefined;
    try {
        prefix = base58.decode(approvalMessage)[0];
    } catch {
        return false;
    }
    return prefix != null && (prefix & 0x80) !== 0 && (prefix & 0x7f) === 1;
}

function serializedTransaction(transaction: GetTransactionSuccessResponse): string | undefined {
    return "transaction" in transaction.onChain && typeof transaction.onChain.transaction === "string"
        ? transaction.onChain.transaction
        : undefined;
}

export const solanaChainAdapter: ChainAdapter = {
    nativeToken: "sol",
    walletLocatorPrefix: "me:solana:smart",
    supportsSignatures: false,

    addSignerChain(_chain: Chain): AddSignerChain | undefined {
        return undefined;
    },

    extractAddSignerOperation(
        response: RegisterSignerResponse,
        _chain: Chain,
        _signer: AddSignerContext
    ): PendingSignerOperation | null {
        if (!("transaction" in response) || response.transaction == null) {
            walletsLogger.error("wallet.addSigner.error", {
                error: "Expected transaction in response for Solana/Stellar chain",
            });
            throw new Error("Expected transaction in response for Solana/Stellar chain");
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

    signApproval(signer: SignerAdapter, transaction: GetTransactionSuccessResponse, approvalMessage: string) {
        // An external wallet signs through its adapter, which needs the whole transaction.
        if (signer.type !== "external-wallet") {
            return signer.signTransaction(approvalMessage);
        }
        // web3.js cannot serialize a version-1 message, so no adapter can sign one. Sign the bytes instead.
        if (isVersion1Message(approvalMessage)) {
            return signer.signMessage(approvalMessage);
        }
        return signer.signTransaction(serializedTransaction(transaction) ?? approvalMessage);
    },
};
