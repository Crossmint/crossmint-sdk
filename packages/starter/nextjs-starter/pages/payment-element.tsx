import { CrossmintPaymentElement } from "@crossmint/client-sdk-react-ui";

export default function PaymentElementPage() {
    return (
        <CrossmintPaymentElement
            environment="https://crossmint-main-git-checkout-embedded-new-element-p2-crossmint.vercel.app"
            clientId="db218e78-d042-4761-83af-3c4e5e6659dd"
            mintConfig={{ totalPrice: "0.001", quantity: "1" }}
            recipient={{ wallet: "0xdC9bb9929b79b62d630A7C3568c979a2843eFd8b" }}
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
    );
}
