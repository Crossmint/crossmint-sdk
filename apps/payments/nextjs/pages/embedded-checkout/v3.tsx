import { CrossmintEmbeddedCheckout, CrossmintProvider } from "@crossmint/client-sdk-react-ui";

export default function EmbeddedCheckoutV3Page() {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "start",
                padding: "20px",
                // backgroundColor: "#f2f2f2",
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
                <CrossmintProvider
                    overrideBaseUrl="https://dserver.maxf.io"
                    apiKey="ck_development_5zmgbGLxswXuRtUhjg5ACqZNkdZFPuN8UzCamj7kevGknYRL3EpLTRobh3HdSt1iQSRWSiCmRzEkdFQoqWZ71UyK4EhV3XTzcSnXkmorRG5ac1gQwqw8zmmM6bLNtREBb54L77Hzrf9XpDodh1c5awZUJntqbdPqgYRh8N9PaJ7gXTm2TMQDGABHs33Wxd88PxmTbjf8xYNrpPpNp8UfYaeT"
                >
                    <CrossmintEmbeddedCheckout
                        // recipient={{
                        //     walletAddress: "0x5e575279bf9f4acf0a130c186861454247394c06",
                        // }}
                        lineItems={{
                            collectionLocator: "crossmint:206b3146-f526-444e-bd9d-0607d581b0e9",
                            callData: {
                                totalPrice: "0.001",
                                quantity: 1,
                            },
                        }}
                        payment={{
                            crypto: {
                                enabled: true,
                                defaultChain: "ethereum-sepolia",
                                defaultCurrency: "eth",
                            },
                            fiat: {
                                enabled: true,
                                allowedMethods: {
                                    card: true,
                                    applePay: true,
                                    googlePay: true,
                                },
                            },
                            defaultMethod: "crypto",
                        }}
                    />
                </CrossmintProvider>
            </div>
        </div>
    );
}
