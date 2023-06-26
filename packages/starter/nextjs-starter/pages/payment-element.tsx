import { CrossmintPaymentElement } from "@crossmint/client-sdk-react-ui";

export default function PaymentElementPage() {
    return (
        <CrossmintPaymentElement
            environment="http://localhost:3000"
            collectionId="<COLLECTION_ID>"
            projectId="<PROJECT_ID>"
            mintConfig={{ totalPrice: "0.001", quantity: "1" }}
            recipient={{ email: "peg@paella.dev" }}
        />
    );
}
