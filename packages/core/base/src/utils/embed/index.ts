import {
    CrossmintEmbeddedCheckoutProps,
    CryptoEmbeddedCheckoutProps,
    CryptoEmbeddedCheckoutPropsWithSigner,
    CryptoPaymentMethod,
    FiatEmbeddedCheckoutProps,
} from "../../types";

export * from "./updatableParams";

export function isFiatEmbeddedCheckoutProps(props: CrossmintEmbeddedCheckoutProps): props is FiatEmbeddedCheckoutProps {
    return props.paymentMethod == null || props.paymentMethod === "fiat";
}

export function isCryptoEmbeddedCheckoutProps(
    props: CrossmintEmbeddedCheckoutProps
): props is CryptoEmbeddedCheckoutProps {
    return (Object.values(CryptoPaymentMethod) as string[]).includes(props.paymentMethod ?? "");
}

export function isCryptoEmbeddedCheckoutPropsWithSigner(
    props: CrossmintEmbeddedCheckoutProps
): props is CryptoEmbeddedCheckoutPropsWithSigner {
    return isCryptoEmbeddedCheckoutProps(props) && props.signer != null;
}
