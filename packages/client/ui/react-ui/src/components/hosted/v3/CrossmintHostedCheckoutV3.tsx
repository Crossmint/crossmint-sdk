import { type MouseEvent, type JSX, useEffect, useState } from "react";
import { CrossmintLogoV2 } from "@/components/common/CrossmintLogoV2/CrossmintLogoV2";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import {
    crossmintHostedCheckoutV3Service,
    crossmintHostedCheckoutV3StylesService,
    isHostedCheckoutV3ExistingOrderProps,
    type CrossmintHostedCheckoutV3AllProps,
    type CrossmintHostedCheckoutV3Props,
    type CrossmintHostedCheckoutV3OrderProps,
} from "@crossmint/client-sdk-base";
import clsx from "clsx";

export type CrossmintHostedCheckoutV3ReactProps = CrossmintHostedCheckoutV3AllProps & JSX.IntrinsicElements["button"];

function extractProps(props: CrossmintHostedCheckoutV3ReactProps) {
    if (isHostedCheckoutV3ExistingOrderProps(props as CrossmintHostedCheckoutV3AllProps)) {
        const { orderId, clientSecret, locale, payment, appearance, onClick, className, children, ...restButtonProps } =
            props as CrossmintHostedCheckoutV3OrderProps & JSX.IntrinsicElements["button"];
        return {
            customProps: { orderId, clientSecret, locale, payment, appearance } as CrossmintHostedCheckoutV3AllProps,
            onClick,
            className,
            children,
            restButtonProps,
        };
    }

    const {
        lineItems,
        payment,
        recipient,
        locale,
        appearance,
        metadata,
        onClick,
        className,
        children,
        ...restButtonProps
    } = props as CrossmintHostedCheckoutV3Props & JSX.IntrinsicElements["button"];
    return {
        customProps: {
            lineItems,
            payment,
            recipient,
            locale,
            appearance,
            metadata,
        } as CrossmintHostedCheckoutV3AllProps,
        onClick,
        className,
        children,
        restButtonProps,
    };
}

export function CrossmintHostedCheckout(props: CrossmintHostedCheckoutV3ReactProps) {
    const [didInjectCss, setDidInjectCss] = useState(false);

    const { crossmint } = useCrossmint();
    const apiClient = createCrossmintApiClient(crossmint);

    const { customProps, onClick, className, children, restButtonProps } = extractProps(props);

    const hostedCheckoutService = crossmintHostedCheckoutV3Service({ apiClient, hostedCheckoutProps: customProps });
    const stylesService = crossmintHostedCheckoutV3StylesService(customProps);

    function _onClick(e: MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        e.stopPropagation();
        hostedCheckoutService.createWindow();

        if (onClick) {
            onClick(e);
        }
    }

    const css = stylesService.generateCss();

    useEffect(() => {
        const { cleanup } = stylesService.injectCss(css);
        setDidInjectCss(true);
        return cleanup;
    }, [css]);

    if (!didInjectCss) {
        return null;
    }

    return (
        <button
            onClick={_onClick}
            className={clsx(stylesService.identifiers.buttonClassNames, className)}
            {...restButtonProps}
        >
            <CrossmintLogoV2
                style={{ marginRight: "12px", flex: "none" }}
                displayType="icon-only"
                id={stylesService.identifiers.logoId}
                height={16}
                width={16}
            />
            {children ?? <p style={{ margin: 0 }}>{stylesService.getButtonText()}</p>}
        </button>
    );
}
