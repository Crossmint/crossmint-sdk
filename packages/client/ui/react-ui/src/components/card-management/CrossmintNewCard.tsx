import type {
    CrossmintCardPaymentMethod,
    CrossmintCardToken,
    EmbeddedCheckoutV3Appearance,
} from "@crossmint/client-sdk-base";
import { CrossmintPaymentMethodManagement } from "./CrossmintPaymentMethodManagement";

export interface CrossmintNewCardProps {
    jwt?: string;
    appearance?: EmbeddedCheckoutV3Appearance;
    onCardTokenized?: (cardToken: CrossmintCardToken) => void | Promise<void>;
    onPaymentMethodAdded?: (paymentMethod: CrossmintCardPaymentMethod) => void | Promise<void>;
}

export function CrossmintNewCard(props: CrossmintNewCardProps) {
    return (
        <CrossmintPaymentMethodManagement
            jwt={props.jwt}
            mode="add-only"
            allowedPaymentMethodTypes={["card"]}
            appearance={props.appearance}
            onPaymentMethodSelected={(result) => {
                if (result.type === "card-token") {
                    return props.onCardTokenized?.(result.cardToken);
                }
                return props.onPaymentMethodAdded?.(result.paymentMethod);
            }}
        />
    );
}
