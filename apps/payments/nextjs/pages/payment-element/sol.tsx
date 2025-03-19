import { DynamicConnectButton, DynamicContextProvider, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useEffect, useState } from "react";

import type { InitialQuotePayload } from "@crossmint/client-sdk-base";
import { CrossmintPaymentElement_DEPRECATED } from "@crossmint/client-sdk-react-ui";

import QuoteSummary from "../../components/quote-summary";
import { isSolanaWallet } from "@dynamic-labs/solana";

export default function PaymentElementPage() {
    const [count, setCount] = useState(1);

    return (
        <DynamicContextProvider
            settings={{
                initialAuthenticationMode: "connect-only",
                environmentId: "377e1f17-8ef9-4a9a-b35c-6a13ffb1de5e",
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

    const [signer, setSigner] = useState<any>(null);

    const { primaryWallet } = useDynamicContext();

    async function getSigner() {
        if (primaryWallet == null || !isSolanaWallet(primaryWallet)) {
            throw new Error("Primary wallet is not solana");
        }

        const _signer = await primaryWallet.getSigner();
        console.log("_signer", _signer);
        setSigner(_signer);
    }

    useEffect(() => {
        console.log("primaryWallet", primaryWallet);
        if (primaryWallet == null) {
            return;
        }
        getSigner();
    }, [primaryWallet]);

    if (signer == null || primaryWallet?.chain != "SOL") {
        return <p>Connect wallet</p>;
    }

    return (
        <>
            {quoteMessage != null ? <QuoteSummary initialQuotePayload={quoteMessage} /> : "Loading..."}

            <CrossmintPaymentElement_DEPRECATED
                environment="staging"
                clientId="94273c86-b888-4734-a851-6464c7cce707"
                recipient={{ wallet: signer.publicKey.toString() }}
                mintConfig={{ type: "candy-machine", quantity: count }}
                paymentMethod="SOL"
                signer={{
                    address: signer.publicKey.toString(),
                    signAndSendTransaction: async (transaction) => {
                        const signRes = await signer.signAndSendTransaction(transaction);
                        console.log("signRes", signRes);
                        return signRes.signature;
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
