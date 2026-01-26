import { CrossmintEmbeddedCheckout, useCrossmintCheckout } from "@crossmint/client-sdk-react-ui";
import { useEffect } from "react";

const USE_CUSTOM_RENDERING = false;

export function EmbeddedCheckoutV3Content({ jwt }: { jwt?: string }) {
    const { order } = useCrossmintCheckout();

    useEffect(() => {
        console.log("order in sdk", order);
    }, [order]);

    if (USE_CUSTOM_RENDERING) {
        switch (order?.phase) {
            case "completed":
                return <div>Custom completed screen</div>;
            case "delivery":
                return <div>Custom delivery screen</div>;
            default:
                return <CrossmintEmbeddedCheckoutWrapper />;
        }
    }

    return <CrossmintEmbeddedCheckoutWrapper />;
}

function CrossmintEmbeddedCheckoutWrapper() {
    return (
        <CrossmintEmbeddedCheckout
            recipient={{
                walletAddress: "maxfQWBno84Zfu4sXgmjYvsvLn4LzGFSgSkFMFuzved",
            }}
            lineItems={{
                tokenLocator: "solana:7EivYFyNfgGj8xbUymR7J4LuxUHLKRzpLaERHLvi7Dgu",
                executionParameters: {
                    mode: "exact-in",
                    amount: "1",
                    maxSlippageBps: "500",
                },
            }}
            payment={{
                receiptEmail: "maxwell@paella.dev",
                crypto: {
                    enabled: false,
                },
                fiat: {
                    enabled: true,
                },
                defaultMethod: "fiat",
            }}
            // appearance={{
            //     variables: {
            //         colors: {
            //             backgroundPrimary: "black",
            //         },
            //     },
            // }}
        />
    );
}
