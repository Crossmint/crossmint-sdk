import { useEffect, useState } from "react";

import { CrossmintPaymentElement } from "@crossmint/client-sdk-react-ui";
import { CrossmintEvents, InitialQuotePayload } from "@crossmint/client-sdk-base";
import QuoteSummary from "../components/quote-summary";

export default function PaymentElementPage() {
    const [count, setCount] = useState(1);
    const [quoteMessage, setQuoteMessage] = useState<InitialQuotePayload>(null as any);

    useEffect(() => {
        const handleWindowMessage = (e: MessageEvent) => {
            const { data } = e;
            if (data == null || typeof data !== "object") {
                return;
            }
            const eventType = data.type;
            const eventPayload = data.payload;
            if (eventType === CrossmintEvents.QUOTE_STATUS_CHANGED) {
                setQuoteMessage(eventPayload);
            }

        };

        window.addEventListener("message", handleWindowMessage);
        return () => window.removeEventListener("message", handleWindowMessage);
    }, []);


    return (
        <div style={{
            display: "flex",
            alignSelf: "center",
            flexDirection: "column",

        }}>
            <div
                style={{
                    marginTop: "100px",
                    display: "flex",
                    alignSelf: "center",
                    flexDirection: "column",
                    width: "420px",
                    gap: "20px",
                }}
            >
                <button onClick={() => setCount(count + 1)}>Increment count: {count}</button>

                {quoteMessage != null ? <QuoteSummary initialQuotePayload={quoteMessage} /> : "Loading..."}


                <CrossmintPaymentElement
                    environment="https://crossmint-main-git-main-crossmint.vercel.app"
                    clientId="db218e78-d042-4761-83af-3c4e5e6659dd"
                    recipient={{ wallet: "maxfQWBno84Zfu4sXgmjYvsvLn4LzGFSgSkFMFuzved" }}
                    mintConfig={{
                        testCount: count,
                    }}
                    paymentMethod="ETH"
                    signer={{
                        address: "0xdC9bb9929b79b62d630A7C3568c979a2843eFd8b",
                        signAndSendTransaction: async (tx) => {
                            return "0x1234";
                        },
                    }}
                    onEvent={(event) => {
                        console.log(event);
                    }}
                />
            </div>
        </div>

    );
}
