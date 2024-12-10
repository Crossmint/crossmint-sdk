import { EthereumWalletConnectors } from "@dynamic-labs/ethereum-all";
import { DynamicConnectButton, DynamicContextProvider, useDynamicContext } from "@dynamic-labs/sdk-react";
import { useEffect, useState } from "react";

import type { InitialQuotePayload } from "@crossmint/client-sdk-base";
import { CrossmintPaymentElement_DEPRECATED } from "@crossmint/client-sdk-react-ui";

import QuoteSummary from "../../components/quote-summary";

export default function PaymentElementPage() {
    const [count, setCount] = useState(1);

    return (
        <DynamicContextProvider
            settings={{
                initialAuthenticationMode: "connect-only",
                environmentId: "377e1f17-8ef9-4a9a-b35c-6a13ffb1de5e",
                walletConnectors: [EthereumWalletConnectors],
            }}
        >
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
                    <DynamicConnectButton>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                width: "460px",
                                alignSelf: "center",
                            }}
                        >
                            <p>Connect your wallet</p>
                        </div>
                    </DynamicConnectButton>

                    <button onClick={() => setCount(count + 1)}>Increment count: {count}</button>

                    <Content count={count} />
                </div>
            </div>
        </DynamicContextProvider>
    );
}

function Content({ count }: { count: number }) {
    const [quoteMessage, setQuoteMessage] = useState<InitialQuotePayload | undefined>();

    const [address, setAddress] = useState<string>("");
    const [signer, setSigner] = useState<any>(null);

    const { walletConnector } = useDynamicContext();

    async function getSigner() {
        const _signer = await walletConnector?.getSigner();
        const _address = await walletConnector?.fetchPublicAddress();
        console.log("_signer", _signer);
        console.log("_address", _address);
        setSigner(_signer);
        setAddress(_address!);
    }

    useEffect(() => {
        console.log("walletConnector", walletConnector);
        getSigner();
    }, [walletConnector]);

    if (signer == null || !address || !["EVM", "ETH"].includes(walletConnector?.connectedChain || "")) {
        return <p>Connect wallet</p>;
    }

    return (
        <>
            {quoteMessage != null ? <QuoteSummary initialQuotePayload={quoteMessage} /> : "Loading..."}

            <CrossmintPaymentElement_DEPRECATED
                environment="staging"
                clientId="1bd7b6b4-a390-4716-82f3-f78f9f2aa335"
                recipient={{ wallet: address }}
                mintConfig={{ totalPrice: `${0.001 * count}`, quantity: count }}
                paymentMethod="ETH"
                signer={{
                    address,
                    signAndSendTransaction: async (transaction) => {
                        const signRes = await signer.sendTransaction(transaction);
                        console.log("signRes", signRes);
                        return signRes.hash;
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
        </>
    );
}
