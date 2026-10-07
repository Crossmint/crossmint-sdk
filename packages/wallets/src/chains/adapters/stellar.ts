import type { Chain } from "../chains";
import type { RegisterSignerResponse } from "../../api";
import type { TokenBalance, PendingSignerOperation } from "../../wallets/types";
import { walletsLogger } from "../../logger";
import type { AddSignerChain, AddSignerContext, ChainAdapter } from "../chain-adapter";
import type { SignerAdapter } from "../../signers/types";
import { Base64, Hex } from "ox";

export const stellarChainAdapter: ChainAdapter = {
    nativeToken: "xlm",
    walletLocatorPrefix: "me:stellar:smart",
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

    signApproval(signer: SignerAdapter, _transaction: unknown, approvalMessage: string) {
        // A passkey's approval message is the base64 auth entry preimage hash, and the contract checks that the
        // WebAuthn challenge is exactly those 32 bytes. WebAuthn signing takes the challenge as hex, so convert
        // the bytes rather than hand over the base64 text.
        if (signer.type === "passkey") {
            return signer.signTransaction(Hex.fromBytes(Base64.toBytes(approvalMessage)));
        }
        return signer.signTransaction(approvalMessage);
    },
};
