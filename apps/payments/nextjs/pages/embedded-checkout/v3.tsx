import { CrossmintEmbeddedCheckout, CrossmintSdkProvider } from "@crossmint/client-sdk-react-ui";

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
                    maxWidth: "500px",
                }}
            >
                <CrossmintSdkProvider apiKey="ck_development_5zmgbGLxswXuRtUhjg5ACqZNkdZFPuN8UzCamj7kevGknYRL3EpLTRobh3HdSt1iQSRWSiCmRzEkdFQoqWZ71UyK4EhV3XTzcSnXkmorRG5ac1gQwqw8zmmM6bLNtREBb54L77Hzrf9XpDodh1c5awZUJntqbdPqgYRh8N9PaJ7gXTm2TMQDGABHs33Wxd88PxmTbjf8xYNrpPpNp8UfYaeT">
                    <CrossmintEmbeddedCheckout />
                </CrossmintSdkProvider>
            </div>
        </div>
    );
}
