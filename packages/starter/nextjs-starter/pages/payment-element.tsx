import {
    DynamicConnectButton,
    DynamicContextProvider,
    DynamicWidget,
    useDynamicContext,
} from "@dynamic-labs/sdk-react";
import { useEffect, useState } from "react";

import { CrossmintPaymentElement } from "@crossmint/client-sdk-react-ui";

export default function PaymentElementPage() {
    const [count, setCount] = useState(1);
    const [signer, setSigner] = useState<any>(null);

    return (
        <DynamicContextProvider
            settings={{
                initialAuthenticationMode: "connect-only",
                environmentId: "377e1f17-8ef9-4a9a-b35c-6a13ffb1de5e",
                eventsCallbacks: {
                    onConnectSuccess: async ({ walletConnector }) => {
                        const _signer = await walletConnector?.getSigner();
                        console.log("_signer", _signer);
                        setSigner(_signer);
                    },
                },
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    gap: "20px",
                }}
            >
                <button onClick={() => setCount(count + 1)}>Increment count: {count}</button>

                <DynamicConnectButton>
                    <p>Connect</p>
                </DynamicConnectButton>

                {<Content count={count} />}
            </div>
        </DynamicContextProvider>
    );
}

function Content({ count }: { count: number }) {
    const [signer, setSigner] = useState<any>(null);

    const { walletConnector } = useDynamicContext();

    async function getSigner() {
        const _signer = await walletConnector?.getSigner();
        console.log("_signer", _signer);
        setSigner(_signer);
    }

    useEffect(() => {
        console.log("walletConnector", walletConnector);
        getSigner();
    }, [walletConnector]);

    if (signer == null) {
        return <p>Connect wallet</p>;
    }

    return (
        <CrossmintPaymentElement
            environment="https://crossmint-main-git-checkout-embedded-p5-crossmint.vercel.app"
            clientId="db218e78-d042-4761-83af-3c4e5e6659dd"
            recipient={{ wallet: "maxfQWBno84Zfu4sXgmjYvsvLn4LzGFSgSkFMFuzved" }}
            mintConfig={{
                testCount: count,
            }}
            paymentMethod="SOL"
            signer={{
                address: signer.publicKey.toString(),
                signAndSendTransaction: async (transaction) => {
                    return (await signer.signAndSendTransaction(transaction)).signature;
                },
            }}
            onEvent={(event) => {
                console.log(event);

                if (event.type === "payment:process.succeeded") {
                    console.log("PAYMENT SUCCESS. SHOW MINTING", event);
                }
            }}
        />
    );
}
