import { CrossmintAuthProvider, useCrossmintAuth } from "@crossmint/client-sdk-react-ui";
import { EmbeddedCheckoutV3ClientProviders } from "../../../components/embed-v3/EmbeddedCheckoutV3ClientProviders";
import { EmbeddedCheckoutV3Content } from "../../../components/embed-v3/EmbeddedCheckoutV3Content";
import { AuthButton } from "../../../components/common/AuthButton";

export default function EmbeddedCheckoutV3Page() {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "start",
                padding: "20px",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "start",
                    width: "100%",
                    maxWidth: "450px",
                }}
            >
                <EmbeddedCheckoutV3ClientProviders>
                    <CrossmintAuthProvider>
                        <Content />
                    </CrossmintAuthProvider>
                </EmbeddedCheckoutV3ClientProviders>
            </div>
        </div>
    );
}

function Content() {
    const { jwt } = useCrossmintAuth();

    const conditionalCheckout = () => {
        if (jwt == null) {
            return null;
        }
        return <EmbeddedCheckoutV3Content jwt={jwt} />;
    };

    return (
        <>
            <AuthButton style={{ marginBottom: "30px" }} />
            {conditionalCheckout()}
        </>
    );
}
