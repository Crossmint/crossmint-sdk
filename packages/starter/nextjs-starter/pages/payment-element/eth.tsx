import { EthereumWalletConnectors } from "@dynamic-labs/ethereum-all";
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
                    flexDirection: "column",
                    width: "100%",
                    gap: "20px",
                }}
            >
                <button onClick={() => setCount(count + 1)}>Increment count: {count}</button>

                <DynamicConnectButton>
                    <p>Connect</p>
                </DynamicConnectButton>

                <Content count={count} />
            </div>
        </DynamicContextProvider>
    );
}

function Content({ count }: { count: number }) {
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
        <CrossmintPaymentElement
            environment="https://crossmint-main-git-checkout-embedded-p5-crossmint.vercel.app"
            clientId="db218e78-d042-4761-83af-3c4e5e6659dd"
            recipient={{ wallet: "maxfQWBno84Zfu4sXgmjYvsvLn4LzGFSgSkFMFuzved" }}
            mintConfig={{
                testCount: count,
            }}
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

                if (event.type === "payment:process.succeeded") {
                    console.log("PAYMENT SUCCESS. SHOW MINTING", event);
                }
            }}
        />
    );
}
