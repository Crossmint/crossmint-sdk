import { CrossmintPayButton } from "@crossmint/client-sdk-react-ui";

export default function Index() {
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
            <CrossmintPayButton clientId="7e94eb71-06c0-447f-9272-677416fee1d5" />
        </div>
    );
}
