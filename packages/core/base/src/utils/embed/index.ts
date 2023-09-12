import {
    CrossmintEmbeddedCheckoutProps,
    CryptoEmbeddedCheckoutProps,
    CryptoPaymentMethod,
    FiatEmbeddedCheckoutProps,
} from "../../types";

export function isFiatEmbeddedCheckoutProps(props: CrossmintEmbeddedCheckoutProps): props is FiatEmbeddedCheckoutProps {
    return props.paymentMethod == null || props.paymentMethod === "fiat";
}

export function isCryptoEmbeddedCheckoutProps(
    props: CrossmintEmbeddedCheckoutProps
): props is CryptoEmbeddedCheckoutProps {
    return (Object.values(CryptoPaymentMethod) as string[]).includes(props.paymentMethod ?? "");
}
