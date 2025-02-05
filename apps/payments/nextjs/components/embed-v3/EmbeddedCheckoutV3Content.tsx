import { CrossmintEmbeddedCheckout, useCrossmintCheckout } from "@crossmint/client-sdk-react-ui";
import { useEffect } from "react";

const USE_CUSTOM_RENDERING = false;

export function EmbeddedCheckoutV3Content() {
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
                // email: "maxwell@paella.dev",
                walletAddress: "0x8b821dd648599B0D093F55B5BaAA48c709ec455A",
            }}
            lineItems={{
                collectionLocator: "crossmint:206b3146-f526-444e-bd9d-0607d581b0e9",
                callData: {
                    totalPrice: "0.001",
                    quantity: 1,
                },
            }}
            payment={{
                receiptEmail: "maxwell@paella.dev",
                crypto: {
                    enabled: true,
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
