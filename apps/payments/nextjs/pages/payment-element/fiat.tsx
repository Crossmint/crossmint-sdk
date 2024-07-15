import { useState } from "react";

import { InitialQuotePayload } from "@crossmint/client-sdk-base";
import { CrossmintPaymentElement } from "@crossmint/client-sdk-react-ui";

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
                environment="staging"
                clientId="1bd7b6b4-a390-4716-82f3-f78f9f2aa335"
                recipient={{ wallet: "0xdC9bb9929b79b62d630A7C3568c979a2843eFd8b" }}
                mintConfig={{ totalPrice: `${0.001 * count}`, quantity: count }}
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
            />
        </>
    );
}
