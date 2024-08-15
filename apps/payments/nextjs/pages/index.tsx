import { SmartWalletSDK } from "@crossmint/client-sdk-smart-wallet";

export default function Index() {
    const handleClick = () => {
        SmartWalletSDK.init({ clientApiKey: "ahhhh" });
    };

    return (
        <div
            style={{
                width: "100%",
                height: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <button
                style={{
                    padding: "10px 20px",
                    fontSize: "16px",
                    cursor: "pointer",
                }}
                onClick={handleClick}
            >
                Click me
            </button>
        </div>
    );
}
