import DynamicContextProviderWrapper from "@/components/dynamic-xyz/DynamicContextProviderWrapper";
import type { EmbeddedCheckoutV3IFrameEmitter } from "@crossmint/client-sdk-base";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { useEffect } from "react";

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
                    // biome-ignore lint/suspicious/useAwait: don't neeed to use any await, but we need to return a promise
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
                        const chain = wallet.chain;
                        if (!chain) {
                            console.error("[CryptoWalletConnectionHandler] handleConnectedWallet: chain is missing");
                            iframeClient?.send("crypto:connect-wallet.failed", {
                                error: "chain is missing",
                            });
                            return false;
                        }

                        iframeClient?.send("crypto:connect-wallet.success", {
                            address,
                            chain,
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
    const { setShowAuthFlow } = useDynamicContext();

    useEffect(() => {
        if (iframeClient == null) {
            return;
        }
        const listenerId = iframeClient.on("crypto:connect-wallet.show", ({ show }) => {
            console.log("crypto:connect-wallet.show", show);
            setShowAuthFlow(show);
        });

        return () => {
            iframeClient.off(listenerId);
        };
    }, [iframeClient]);

    return null;
}
