import { CrossmintPaymentElement } from "@crossmint/client-sdk-react-ui";

export default function PaymentElementPage() {
    return (
        <CrossmintPaymentElement
            environment="http://localhost:3000"
            clientId="6845c702-8396-4339-b17e-a2bf12d2cf6d"
            mintConfig={{ totalPrice: "0.001", quantity: "1" }}
            recipient={{ email: "peg@paella.dev" }}
        />
    );
}
