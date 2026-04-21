import type { CrossmintCardToken, EmbeddedCheckoutV3Appearance } from "@crossmint/client-sdk-base";
import { CrossmintPaymentMethodManagement } from "./CrossmintPaymentMethodManagement";

export interface CrossmintNewCardProps {
    appearance?: EmbeddedCheckoutV3Appearance;
    onCardTokenized?: (cardToken: CrossmintCardToken) => void | Promise<void>;
}

export function CrossmintNewCard(props: CrossmintNewCardProps) {
    return (
        <CrossmintPaymentMethodManagement
            mode="add-only"
            allowedPaymentMethodTypes={["card"]}
            appearance={props.appearance}
            onPaymentMethodSelected={(paymentMethod) => {
                if (paymentMethod.type === "card-token") {
                    return props.onCardTokenized?.(paymentMethod.cardToken);
                }
            }}
        />
    );
}
