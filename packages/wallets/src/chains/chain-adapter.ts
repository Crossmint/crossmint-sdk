import type { Chain } from "./chains";
import type { GetTransactionSuccessResponse, RegisterSignerChain, RegisterSignerResponse } from "../api";
import type { SignerAdapter } from "../signers/types";
import type { TokenBalance, PendingSignerOperation } from "../wallets/types";
import { getChainType } from "../signers/server/helpers/get-chain-type";
import { evmChainAdapter } from "./adapters/evm";
import { solanaChainAdapter } from "./adapters/solana";
import { stellarChainAdapter } from "./adapters/stellar";

export type AddSignerChain = RegisterSignerChain;

export type AddSignerContext = { locator: string; type: string };

export interface ChainAdapter {
    readonly nativeToken: "eth" | "sol" | "xlm";
    readonly walletLocatorPrefix: "me:evm:smart" | "me:solana:smart" | "me:stellar:smart";
    readonly supportsSignatures: boolean;
    addSignerChain(chain: Chain): AddSignerChain | undefined;
    extractAddSignerOperation(
        response: RegisterSignerResponse,
        chain: Chain,
        signer: AddSignerContext
    ): PendingSignerOperation | null;
    balanceTokenFields(chainData: unknown): Partial<TokenBalance>;
    emptyBalanceTokenFields(): Partial<TokenBalance>;
    /**
     * Sign one pending approval, choosing the payload and the signer method the chain needs.
     * Most signers sign the approval message the API supplies.
     */
    signApproval(
        signer: SignerAdapter,
        transaction: GetTransactionSuccessResponse,
        approvalMessage: string
    ): ReturnType<SignerAdapter["signMessage"]>;
}

const CHAIN_ADAPTERS = {
    evm: evmChainAdapter,
    solana: solanaChainAdapter,
    stellar: stellarChainAdapter,
} as const;

export type ChainType = keyof typeof CHAIN_ADAPTERS;

export function getChainAdapter(chain: Chain): ChainAdapter {
    return CHAIN_ADAPTERS[getChainType(chain)];
}

export function isSupportedChainType(chainType: string): chainType is ChainType {
    return Object.prototype.hasOwnProperty.call(CHAIN_ADAPTERS, chainType);
}

/**
 * The adapter that decides how to sign an approval. Keyed off the chain the API reports for the
 * transaction, not the wallet's own chain, so a response overrides the wallet where the two differ.
 */
export function getApprovalAdapter(chainType: string, fallback: ChainAdapter): ChainAdapter {
    return isSupportedChainType(chainType) ? CHAIN_ADAPTERS[chainType] : fallback;
}
