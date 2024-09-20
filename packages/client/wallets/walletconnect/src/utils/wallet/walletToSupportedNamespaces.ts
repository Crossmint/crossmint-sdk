import {
    WALLETCONNECT_SOLANA_DEVNET_CHAIN_IDENTIFIER,
    WALLETCONNECT_SOLANA_MAINNET_CHAIN_IDENTIFIER,
} from "@/consts/walletconnect";
import type { CrossmintWalletConnectWallet } from "@/types/wallet";
import type { BuildApprovedNamespacesParams } from "@walletconnect/utils";

import { blockchainToChainId, isEVMBlockchain } from "@crossmint/common-sdk-base";

import { walletToSupportedMethods } from "./walletToSupportedMethods";

export async function walletToSupportedNamespaces(
    wallet: CrossmintWalletConnectWallet
): Promise<BuildApprovedNamespacesParams["supportedNamespaces"]> {
    const supportedChains = wallet.getSupportedChains();

    const supportedMethods = walletToSupportedMethods(wallet);

    const supportedNamespaces: BuildApprovedNamespacesParams["supportedNamespaces"] = {};

    // TODO: This is slighty incorrect, since we are possibly expecting EVM and Solana chains to be supported
    const address = await wallet.getAddress();

    if (supportedMethods.eip155) {
        const supporedEVMChainIds = supportedChains.filter(isEVMBlockchain).map(blockchainToChainId);
        supportedNamespaces.eip155 = {
            chains: supporedEVMChainIds.map((chainId) => `eip155:${chainId}`),
            methods: supportedMethods.eip155,
            events: ["accountsChanged", "chainChanged"],
            accounts: supporedEVMChainIds.map((chainId) => `eip155:${chainId}:${address}`),
        };
    }
    if (supportedMethods.solana) {
        const supportedSolanaChains = [
            WALLETCONNECT_SOLANA_MAINNET_CHAIN_IDENTIFIER,
            WALLETCONNECT_SOLANA_DEVNET_CHAIN_IDENTIFIER,
        ];
        supportedNamespaces.solana = {
            chains: supportedSolanaChains,
            methods: supportedMethods.solana,
            events: [],
            accounts: supportedSolanaChains.map((chainId) => `${chainId}:${address}`),
        };
    }

    return supportedNamespaces;
}
