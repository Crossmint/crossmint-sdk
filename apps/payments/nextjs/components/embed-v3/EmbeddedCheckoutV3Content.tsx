import { CrossmintEmbeddedCheckout, useCrossmintCheckout } from "@crossmint/client-sdk-react-ui";
import { useEffect } from "react";

const USE_CUSTOM_RENDERING = false;

export function EmbeddedCheckoutV3Content() {
    const { order } = useCrossmintCheckout();

    useEffect(() => {
        console.log("order in sdk", order);
    }, [order]);

    if (USE_CUSTOM_RENDERING) {
        if (order != null) {
            switch (order.phase) {
                case "completed":
                    return <div>Custom completed screen</div>;
                case "delivery":
                    return <div>Custom delivery screen</div>;
                default:
                    return <CrossmintEmbeddedCheckoutWrapper />;
            }
        }
    }

    return <CrossmintEmbeddedCheckoutWrapper />;
}

function CrossmintEmbeddedCheckoutWrapper() {
    return (
        <CrossmintEmbeddedCheckout
            recipient={{
                // email: "maxwell@paella.dev",
                walletAddress: "ExkJp9CVPK6rkLD3BVuE2K4PomSnVdWyChdku9hsXMiC",
            }}
            lineItems={{
                tokenLocator: "solana:6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN",
                executionParameters: {
                    mode: "exact-in",
                    amount: "1",
                    slippageBps: "500",
                }
            }}
            payment={{
                receiptEmail: "peg+1234@paella.dev",
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
