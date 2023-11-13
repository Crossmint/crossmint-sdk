import { useEffect, useState } from "react";

import { InitialQuotePayload } from "@crossmint/client-sdk-base";
import { CrossmintPaymentElement } from "@crossmint/client-sdk-react-ui";

import { MetaMaskProvider, useSDK } from "@metamask/sdk-react";
import { Transaction } from "@ethersproject/transactions";
import QuoteSummary from "../../components/quote-summary";

export default function PaymentElementPage() {
    return (
        <MetaMaskProvider debug={false} sdkOptions={{
            checkInstallationImmediately: false,
            dappMetadata: {
                name: "Demo React App",

            },
        }}>
            <div
                style={{
                    display: "flex",
                    alignSelf: "center",
                    flexDirection: "column",
                }}
            >
                <div
                    style={{
                        marginTop: "100px",
                        display: "flex",
                        alignSelf: "center",
                        flexDirection: "column",
                        width: "480px",
                        gap: "20px",
                    }}
                >

                    <Content />
                </div>
            </div>
        </MetaMaskProvider>
    );
}

function Content() {
    const [quoteMessage, setQuoteMessage] = useState<InitialQuotePayload | undefined>();

    const [account, setAccount] = useState<string>();
    const { sdk, connected, connecting, provider, chainId } = useSDK();

    const connect = async () => {
        try {
            const accounts = await sdk?.connect();
            setAccount((accounts as any)?.[0]);
        } catch (err) {
            console.warn(`failed to connect..`, err);
        }
    };


    return (
        <>
            {!(connected && account && provider) && <button onClick={connect}>Connect to metamask</button>}


            {connected && account && provider &&
                <>
                    {quoteMessage != null ? <QuoteSummary initialQuotePayload={quoteMessage} /> : "Loading..."}
                    <CrossmintPaymentElement
                        environment="staging"
                        clientId="50eb4e94-2cfe-49a7-9af6-099c8fa681da"
                        recipient={{ wallet: account }}
                        mintConfig={{ totalPrice: `${0.001}`, quantity: 1 }}
                        paymentMethod="ETH"
                        signer={{
                            address: account,
                            signAndSendTransaction: async (transaction: Transaction) => {
                                if (!window.ethereum) {
                                    throw new Error("No ethereum provider");
                                }
                                return await window.ethereum
                                    .request({
                                        method: "eth_sendTransaction",
                                        params: [{
                                            from: account,
                                            to: transaction.to,
                                            value: transaction.value._hex,
                                            data: transaction.data,
                                        }],
                                    }) as string;
                            },
                        }}
                        onEvent={(event) => {
                            console.log(event);

                            if (event.type === "quote:status.changed") {
                                console.log("QUOTE STATUS CHANGED", event);
                                setQuoteMessage(event.payload);
                            }

                            if (event.type === "payment:process.succeeded") {
                                console.log("PAYMENT SUCCESS. SHOW MINTING", event);
                            }
                        }}
                    />
                </>}
        </>

    );

}
