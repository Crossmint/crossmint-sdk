import {
    DynamicConnectButton,
    DynamicContextProvider,
    DynamicWidget,
    useDynamicContext,
} from "@dynamic-labs/sdk-react";
import { SolanaWalletConnectors } from "@dynamic-labs/solana-all";
import { useEffect, useState } from "react";

import { InitialQuotePayload } from "@crossmint/client-sdk-base";
import { CrossmintEvents, CrossmintPaymentElement } from "@crossmint/client-sdk-react-ui";

import QuoteSummary from "../../components/quote-summary";

export default function PaymentElementPage() {
    const [count, setCount] = useState(1);

    return (
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
                <button onClick={() => setCount(count + 1)}>Increment count: {count}</button>

                <Content count={count} />
            </div>
        </div>
    );
}

function Content({ count }: { count: number }) {
    const [quoteMessage, setQuoteMessage] = useState<InitialQuotePayload | undefined>();

    return (
        <>
            {quoteMessage != null ? <QuoteSummary initialQuotePayload={quoteMessage} /> : "Loading..."}

            <CrossmintPaymentElement
                environment="http://localhost:3000"
                clientId="db218e78-d042-4761-83af-3c4e5e6659dd"
                mintConfig={{ type: "candy-machine", quantity: count }}
                paymentMethod="fiat"
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
                emailInputOptions={{
                    show: true,
                }}
                experimental={{
                    useCardWalletEmail: true,
                }}
            />
        </>
    );
}
