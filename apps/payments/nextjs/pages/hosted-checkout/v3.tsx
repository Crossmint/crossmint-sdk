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
                        lineItems={[
                            {
                                collectionLocator: "crossmint:be2258c4-dde2-4551-ba0e-5e231784bfd2",
                                callData: {
                                    totalPrice: "0.001",
                                    quantity: 1,
                                },
                            },
                            {
                                collectionLocator: "crossmint:be2258c4-dde2-4551-ba0e-5e231784bfd2",
                                callData: {
                                    totalPrice: "0.001",
                                    quantity: 1,
                                },
                            },
                        ]}
                        payment={{
                            crypto: {
                                enabled: true,
                            },
                            fiat: {
                                enabled: true,
                            },
                            defaultMethod: "fiat",
                        }}
                        appearance={{
                            variables: {
                                colors: {
                                    accent: "red",
                                },
                            },
                            // theme: "dark",
                        }}
                    />
                </HostedCheckoutV3ClientProviders>
            </div>
        </div>
    );
}
