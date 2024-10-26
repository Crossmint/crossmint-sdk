import { CrossmintHostedCheckout_Alpha } from "@crossmint/client-sdk-react-ui";
import { HostedCheckoutV3ClientProviders } from "../../components/hosted-v3/HostedCheckoutV3ClientProviders";

export default function HostedCheckoutV3Page() {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "start",
                padding: "20px",
                // backgroundColor: "black",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "start",
                    width: "100%",
                    maxWidth: "450px",
                }}
            >
                <HostedCheckoutV3ClientProviders>
                    <CrossmintHostedCheckout_Alpha
                        lineItems={{
                            collectionLocator: "crossmint:91e3ae09-2d59-4d21-a811-058732351847",
                            // callData: {
                            //     totalPrice: "0.001",
                            //     quantity: 1,
                            // },
                        }}
                        payment={{
                            crypto: {
                                enabled: false,
                            },
                            fiat: {
                                enabled: true,
                            },
                            defaultMethod: "fiat",
                        }}
                    />
                </HostedCheckoutV3ClientProviders>
            </div>
        </div>
    );
}
