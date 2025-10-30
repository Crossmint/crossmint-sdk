import DynamicContextProviderWrapper from "@/components/dynamic-xyz/DynamicContextProviderWrapper";
import type { EmbeddedCheckoutV3IFrameEmitter } from "@crossmint/client-sdk-base";
import {
    blockchainToChainId,
    type APIKeyEnvironmentPrefix,
    type BlockchainIncludingTestnet,
} from "@crossmint/common-sdk-base";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicContext, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { SuiWalletConnectors } from "@dynamic-labs/sui";
import { type Dispatch, type SetStateAction, useContext, useEffect, useState } from "react";
import { handleSendTransaction } from "./utils/handleSendTransaction";
import { ChainNotSupportedError, dynamicChainToCrossmintChain } from "@/utils/dynamic/dynamicChainToCrossmintChain";

export function CryptoWalletConnectionHandler(props: {
    iframeClient: EmbeddedCheckoutV3IFrameEmitter | null;
    apiKeyEnvironment: APIKeyEnvironmentPrefix;
}) {
    const { iframeClient, apiKeyEnvironment } = props;

    console.log("[CryptoWalletConnectionHandler] CryptoWalletConnectionHandler");
    return (
        <DynamicContextProviderWrapper
            apiKeyEnvironment={apiKeyEnvironment}
            settings={{
                walletConnectors: [EthereumWalletConnectors, SolanaWalletConnectors, SuiWalletConnectors],
                events: {
                    onAuthFlowCancel() {
                        console.log("[CryptoWalletConnectionHandler] onAuthFlowCancel");
                        iframeClient?.send("crypto:connect-wallet.failed", {
                            error: "Wallet connection was cancelled",
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
                            console.error(
                                "[CryptoWalletConnectionHandler] Failed to connect wallet: Could not retrieve wallet address"
                            );
                            iframeClient?.send("crypto:connect-wallet.failed", {
                                error: "Could not retrieve wallet address. Please ensure your wallet is properly connected and try again.",
                            });
                            return false;
                        }

                        let chain;
                        try {
                            chain = await dynamicChainToCrossmintChain(wallet);
                        } catch (e) {
                            // If the user's wallet is on a chain we don't support (this should only happen for EVM):
                            // - Switch to the default chain
                            // - If that fails, return an error explaining user must switch to a supported chain
                            if (e instanceof ChainNotSupportedError) {
                                const defaultCrossmintChain =
                                    apiKeyEnvironment === "production" ? "ethereum" : "ethereum-sepolia";
                                const defaultChainId = blockchainToChainId(defaultCrossmintChain);
                                try {
                                    await wallet?.connector?.switchNetwork({
                                        networkChainId: defaultChainId,
                                    });
                                    chain = defaultCrossmintChain;
                                } catch (switchNetworkError) {
                                    console.error(
                                        `[CryptoWalletConnectionHandler] Failed to switch to default chain ${defaultChainId}`,
                                        switchNetworkError
                                    );
                                    iframeClient?.send("crypto:connect-wallet.failed", {
                                        error: `Chain with id ${e.chainId} is not supported. Please change the network in your wallet and try again.`,
                                    });
                                    return false;
                                }
                            } else {
                                throw e;
                            }
                        }

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
    const [showDynamicModal, setShowDynamicModal] = useState(false);
    const { primaryWallet } = useDynamicContext();
    console.log("[CryptoWalletConnectionHandler] _CryptoWalletConnectionHandler", primaryWallet);

    useEffect(() => {
        if (iframeClient == null) {
            return;
        }
        const showAuthFlowListener = iframeClient.on("crypto:connect-wallet.show", ({ show }) => {
            setShowDynamicModal(show);
        });

        return () => {
            iframeClient.off(showAuthFlowListener);
        };
    }, [iframeClient]);

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

        const signMessageListener = iframeClient.on("crypto:sign-message", async ({ message }) => {
            if (primaryWallet == null) {
                console.error("[CryptoWalletConnectionHandler] signMessage: primaryWallet is missing");
                iframeClient.send("crypto:sign-message:failed", {
                    error: "primaryWallet is missing",
                });
                return;
            }

            try {
                const signature = await primaryWallet.signMessage(message);
                if (signature == null) {
                    throw new Error("Failed to sign message");
                }
                iframeClient.send("crypto:sign-message:success", {
                    signature,
                });
            } catch (error) {
                console.error("[CryptoWalletConnectionHandler] failed to sign message", error);
                iframeClient.send("crypto:sign-message:failed", { error: (error as Error).message });
            }
        });

        return () => {
            iframeClient.off(signTransactionListener);
            iframeClient.off(signMessageListener);
        };
    }, [iframeClient, primaryWallet]);

    return showDynamicModal ? <ShowDynamicModal setShowDynamicModal={setShowDynamicModal} /> : null;
}

export function ShowDynamicModal({ setShowDynamicModal }: { setShowDynamicModal: Dispatch<SetStateAction<boolean>> }) {
    const context = useContext(DynamicContext);
    if (context == null) {
        throw new Error("DynamicContext is missing");
    }
    const { setShowAuthFlow, handleLogOut } = context;

    useEffect(() => {
        // Move focus from the iframe to the main page, otherwise the modal will require a double click to interact with it
        document.getElementById("crossmint-focus-target")?.focus();

        (async () => {
            await handleLogOut();
            setShowAuthFlow(true, {
                clearErrors: true,
                emitCancelAuth: true,
                ignoreIfIsEmbeddedWidget: true,
                initializeWalletConnect: true,
                performMultiWalletChecks: false, // Important to be false in order to not require double clicking connect button
            });
            setShowDynamicModal(false);
        })();
    }, []);

    return null;
}
