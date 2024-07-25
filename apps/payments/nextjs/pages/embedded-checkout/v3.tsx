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
                backgroundColor: "#f2f2f2",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "start",
                    width: "100%",
                    maxWidth: "500px",
                }}
            >
                <CrossmintProvider
                    overrideBaseUrl="https://08a3-108-64-2-5.ngrok-free.app"
                    apiKey="ck_development_5zmgbGLxswXuRtUhjg5ACqZNkdZFPuN8UzCamj7kevGknYRL3EpLTRobh3HdSt1iQSRWSiCmRzEkdFQoqWZ71UyK4EhV3XTzcSnXkmorRG5ac1gQwqw8zmmM6bLNtREBb54L77Hzrf9XpDodh1c5awZUJntqbdPqgYRh8N9PaJ7gXTm2TMQDGABHs33Wxd88PxmTbjf8xYNrpPpNp8UfYaeT"
                >
                    <CrossmintEmbeddedCheckout
                        lineItems={{ collectionLocator: "asdasd" }}
                        payment={{
                            crypto: {
                                enabled: true,
                            },
                            fiat: {
                                enabled: true,
                                allowedMethods: {
                                    card: true,
                                    applePay: true,
                                    googlePay: true,
                                },
                            },
                        }}
                    />
                </CrossmintProvider>
            </div>
        </div>
    );
}
