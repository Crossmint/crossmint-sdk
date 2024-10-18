import { CrossmintEmbeddedCheckout_Alpha, CrossmintProvider } from "@crossmint/client-sdk-react-ui";

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
                    apiKey="sk_development_5ZUNkuhjP8aYZEgUTDfWToqFpo5zakEqte1db4pHZgPAVKZ9JuSvnKeGiqY654DoBuuZEzYz4Eb8gRV2ePqQ1fxTjEP8tTaUQdzbGfyG9RgyeN5YbqViXinqxk8EayEkAGtvSSgjpjEr6iaBptJtUFwPW59DjQzTQP6P8uZdiajenVg7bARGKjzFyByNuVEoz41DpRB4hDZNFdwCTuf5joFv"
                >
                    <CrossmintEmbeddedCheckout_Alpha
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
                                defaultCurrency: "inr",
                            },
                            defaultMethod: "fiat",
                        }}
                    />
                </CrossmintProvider>
            </div>
        </div>
    );
}
