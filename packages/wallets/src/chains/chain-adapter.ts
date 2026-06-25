import type { Chain } from "./chains";
import type { RegisterSignerChain, RegisterSignerResponse } from "../api";
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
