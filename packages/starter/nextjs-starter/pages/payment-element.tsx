import { useState } from "react";

import { CrossmintPaymentElement } from "@crossmint/client-sdk-react-ui";

export default function PaymentElementPage() {
    const [count, setCount] = useState(1);

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
