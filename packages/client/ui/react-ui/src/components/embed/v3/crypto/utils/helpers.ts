import type { CrossmintEmbeddedCheckoutV3Props } from "@crossmint/client-sdk-base";
import type { PayerSupportedBlockchains } from "@crossmint/common-sdk-base";

export function havePropsChanged(
    parentProps: CrossmintEmbeddedCheckoutV3Props,
    currentRefProps: CrossmintEmbeddedCheckoutV3Props
): boolean {
    return JSON.stringify(parentProps) !== JSON.stringify(currentRefProps);
}

export function shouldPreserveInitialChain(
    props: CrossmintEmbeddedCheckoutV3Props,
    storedInitialChain: PayerSupportedBlockchains | undefined
): { shouldPreserve: boolean; updatedPayer?: typeof props.payment.crypto.payer } {
    if (props.payment.crypto.payer && storedInitialChain != null) {
        return {
            shouldPreserve: true,
            updatedPayer: {
                ...props.payment.crypto.payer,
                initialChain: storedInitialChain,
            },
        };
    }
    return { shouldPreserve: false };
}
