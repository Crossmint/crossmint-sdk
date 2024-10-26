import { useCrossmint } from "@/hooks";
import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import { crossmintHostedCheckoutV3Service, type CrossmintHostedCheckoutV3Props } from "@crossmint/client-sdk-base";
import type { MouseEvent, JSX } from "react";

export type CrossmintHostedCheckoutV3ReactProps = CrossmintHostedCheckoutV3Props & JSX.IntrinsicElements["button"];

export function CrossmintHostedCheckout_Alpha(props: CrossmintHostedCheckoutV3ReactProps) {
    const { crossmint } = useCrossmint();
    const apiClient = createCrossmintApiClient(crossmint);

    // separate custom props from jsx button props
    const { receipient, locale, webhookPassthroughData, lineItems, payment, appearance, ...buttonProps } = props;
    const customProps: CrossmintHostedCheckoutV3Props = {
        receipient,
        locale,
        webhookPassthroughData,
        lineItems,
        payment,
        appearance,
    };

    const hostedCheckoutService = crossmintHostedCheckoutV3Service({ apiClient, hostedCheckoutProps: customProps });

    const { onClick, ...restButtonProps } = buttonProps;

    function _onClick(e: MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        e.stopPropagation();
        hostedCheckoutService.createWindow();

        if (onClick) {
            onClick(e);
        }
    }

    return (
        <button onClick={_onClick} {...restButtonProps}>
            Pay with Crossmint
        </button>
    );
}
