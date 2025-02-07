import DynamicContextProviderWrapper from "@/components/dynamic-xyz/DynamicContextProviderWrapper";
import type { EmbeddedCheckoutV3IFrameEmitter } from "@crossmint/client-sdk-base";
import type { APIKeyEnvironmentPrefix, BlockchainIncludingTestnet } from "@crossmint/common-sdk-base";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicContext, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { type Dispatch, type SetStateAction, useContext, useEffect, useState } from "react";
import { handleSendTransaction } from "./utils/handleSendTransaction";
import { ChainNotSupportedError, dynamicChainToCrossmintChain } from "@/utils/dynamic/dynamicChainToCrossmintChain";

export function CryptoWalletConnectionHandler(props: {
    iframeClient: EmbeddedCheckoutV3IFrameEmitter | null;
    apiKeyEnvironment: APIKeyEnvironmentPrefix;
}) {
    const { iframeClient, apiKeyEnvironment } = props;

    return (
        <DynamicContextProviderWrapper
            apiKeyEnvironment={apiKeyEnvironment}
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

                        let chain;
                        try {
                            chain = await dynamicChainToCrossmintChain(wallet);
                        } catch (e) {
                            if (e instanceof ChainNotSupportedError) {
                                iframeClient?.send("crypto:connect-wallet.failed", {
                                    error: `Chain with id ${e.chainId} is not supported. Please change the network in your wallet and try again.`,
                                });
                                return false;
                            }
                            throw e;
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

        return () => {
            iframeClient.off(signTransactionListener);
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
