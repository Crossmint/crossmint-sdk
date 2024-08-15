import { SmartWalletSDK } from "@crossmint/client-sdk-smart-wallet";

export default function Index() {
    return (
        <div
            style={{
                width: "100%",
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <h1 style={{ marginBottom: "20px" }}>Welcome to Our Payment App</h1>
            <button
                style={{
                    padding: "10px 20px",
                    fontSize: "16px",
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                }}
                onClick={async () => {
                    SmartWalletSDK.init({ clientApiKey: "ahhhhhh" });
                }}
            >
                Click Me
            </button>
        </div>
    );
}
