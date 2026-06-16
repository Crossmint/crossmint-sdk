import type { AddSignerChain, AddSignerContext, ChainAdapter } from "../chain-adapter";
import type { RegisterSignerChain, RegisterSignerResponse, Signer as APISigner } from "../../api";
import type { Chain } from "../chains";
import type { PendingSignerOperation, TokenBalance } from "../../wallets/types";
import { walletsLogger } from "../../logger";
import { InvalidSignerError } from "../../utils/errors";
import { getPendingSignerOperation } from "../../utils/signer-mapping";

export const evmChainAdapter: ChainAdapter = {
    nativeToken: "eth",
    walletLocatorPrefix: "me:evm:smart",
    supportsSignatures: true,
    addSignerChain(chain: Chain): AddSignerChain | undefined {
        return chain as RegisterSignerChain;
    },
    extractAddSignerOperation(
        response: RegisterSignerResponse,
        chain: Chain,
        signer: AddSignerContext
    ): PendingSignerOperation | null {
        if (!("chains" in response)) {
            walletsLogger.error("wallet.addSigner.error", { error: "Expected chains in response for EVM chain" });
            throw new Error("Expected chains in response for EVM chain");
        }
        if (response.chains?.[chain]?.status === "failed") {
            walletsLogger.error("wallet.addSigner.failed", {
                chain,
                signerType: signer.type,
                signerLocator: signer.locator,
                chainStatus: response.chains?.[chain],
            });
            throw new InvalidSignerError(
                `Signer registration failed for chain ${chain} (signer: ${signer.locator})`,
                JSON.stringify(response.chains?.[chain])
            );
        }
        return getPendingSignerOperation(response as APISigner, chain);
    },
    balanceTokenFields(chainData: unknown): Partial<TokenBalance> {
        if (chainData != null && "contractAddress" in (chainData as object)) {
            return {
                contractAddress: (chainData as { contractAddress: unknown }).contractAddress,
            } as Partial<TokenBalance>;
        }
        return {};
    },
    emptyBalanceTokenFields(): Partial<TokenBalance> {
        return { contractAddress: undefined } as Partial<TokenBalance>;
    },
};
