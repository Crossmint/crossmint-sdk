import DynamicContextProviderWrapper from "@/components/dynamic-xyz/DynamicContextProviderWrapper";
import type { EmbeddedCheckoutV3IFrameEmitter } from "@crossmint/client-sdk-base";
import { type BlockchainIncludingTestnet, chainIdToBlockchain } from "@crossmint/common-sdk-base";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { type HandleConnectedWallet, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { useEffect } from "react";
import { handleSendTransaction } from "./utils/handleSendTransaction";

export function CryptoWalletConnectionHandler(props: { iframeClient: EmbeddedCheckoutV3IFrameEmitter | null }) {
    const { iframeClient } = props;

    return (
        <DynamicContextProviderWrapper
            settings={{
                walletConnectors: [EthereumWalletConnectors, SolanaWalletConnectors],
                events: {
                    onAuthFlowCancel() {
                        console.log("[CryptoWalletConnectionHandler] onAuthFlowCancel");
                        iframeClient?.send("crypto:connect-wallet.failed", {
                            error: "cancelled",
                        });
                    },
                    onAuthFlowClose() {
                        console.log("[CryptoWalletConnectionHandler] onAuthFlowClose");
                    },
                    onAuthFailure(data, reason) {
                        console.error("[CryptoWalletConnectionHandler] onAuthFailure", data, reason);
                    },
                    onAuthSuccess(data) {
                        console.log("[CryptoWalletConnectionHandler] onAuthSuccess", data);
                    },
                },
                handlers: {
                    handleConnectedWallet: async (wallet) => {
                        console.log("[CryptoWalletConnectionHandler] handleConnectedWallet", wallet);

                        const address = wallet.address;
                        if (!address) {
                            console.error("[CryptoWalletConnectionHandler] handleConnectedWallet: address is missing");
                            iframeClient?.send("crypto:connect-wallet.failed", {
                                error: "address is missing",
                            });
                            return false;
                        }

                        const chain = await dynamicChainToCrossmintChain(wallet);

                        iframeClient?.send("crypto:connect-wallet.success", {
                            address,
                            chain,
                            walletProviderKey: wallet.connector?.key,
                        });

                        return true;
                    },
                },
            }}
        >
            <_CryptoWalletConnectionHandler {...props} />
        </DynamicContextProviderWrapper>
    );
}

function _CryptoWalletConnectionHandler({ iframeClient }: Parameters<typeof CryptoWalletConnectionHandler>[0]) {
    const { setShowAuthFlow, primaryWallet, handleLogOut } = useDynamicContext();

    useEffect(() => {
        if (iframeClient == null) {
            return;
        }
        const showAuthFlowListener = iframeClient.on("crypto:connect-wallet.show", async ({ show }) => {
            await handleLogOut();
            setShowAuthFlow(show);
        });

        return () => {
            iframeClient.off(showAuthFlowListener);
        };
    }, [iframeClient, handleLogOut, setShowAuthFlow]);

    useEffect(() => {
        if (iframeClient == null) {
            return;
        }
        const signTransactionListener = iframeClient.on(
            "crypto:send-transaction",
            async ({ chain, serializedTransaction }) => {
                if (primaryWallet == null) {
                    console.error("[CryptoWalletConnectionHandler] signTransaction: primaryWallet is missing");
                    iframeClient.send("crypto:send-transaction:failed", {
                        error: "primaryWallet is missing",
                    });
                    return;
                }

                await handleSendTransaction(
                    primaryWallet,
                    chain as BlockchainIncludingTestnet,
                    serializedTransaction,
                    iframeClient
                );
            }
        );

        return () => {
            iframeClient.off(signTransactionListener);
        };
    }, [iframeClient, primaryWallet]);

    return null;
}

async function dynamicChainToCrossmintChain(
    wallet: Parameters<HandleConnectedWallet>[0]
): Promise<BlockchainIncludingTestnet> {
    const chain = wallet.chain;
    if (chain === "SOL") {
        return "solana";
    }
    const chainId = await wallet.connector?.getNetwork();
    if (typeof chainId !== "number") {
        throw new Error("chainId is not a number");
    }
    const chainFromChainId = chainIdToBlockchain(chainId);
    if (!chainFromChainId) {
        throw new Error(`ChainId ${chainId} is not supported`);
    }
    return chainFromChainId as BlockchainIncludingTestnet;
}
