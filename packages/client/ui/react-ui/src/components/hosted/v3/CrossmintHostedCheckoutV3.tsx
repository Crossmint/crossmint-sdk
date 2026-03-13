import { type MouseEvent, type JSX, useEffect, useState } from "react";
import { CrossmintLogoV2 } from "@/components/common/CrossmintLogoV2/CrossmintLogoV2";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import {
    crossmintHostedCheckoutV3Service,
    crossmintHostedCheckoutV3StylesService,
    type CrossmintHostedCheckoutV3AllProps,
    type CrossmintHostedCheckoutV3Props,
    type CrossmintHostedCheckoutV3OrderProps,
} from "@crossmint/client-sdk-base";
import clsx from "clsx";

export type CrossmintHostedCheckoutV3ReactProps = CrossmintHostedCheckoutV3AllProps & JSX.IntrinsicElements["button"];

export function CrossmintHostedCheckout(props: CrossmintHostedCheckoutV3ReactProps) {
    const [didInjectCss, setDidInjectCss] = useState(false);

    const { crossmint } = useCrossmint();
    const apiClient = createCrossmintApiClient(crossmint);

    let customProps: CrossmintHostedCheckoutV3AllProps;
    let onClick: JSX.IntrinsicElements["button"]["onClick"];
    let className: string | undefined;
    let children: React.ReactNode;
    let restButtonProps: Record<string, unknown>;

    if ("orderId" in props && props.orderId != null) {
        // Existing order flow: orderId + clientSecret required
        const {
            orderId, clientSecret, locale, payment, appearance,
            onClick: _onClick, className: _className, children: _children, ...rest
        } = props as CrossmintHostedCheckoutV3OrderProps & JSX.IntrinsicElements["button"];
        customProps = { orderId, clientSecret, locale, payment, appearance };
        onClick = _onClick;
        className = _className;
        children = _children;
        restButtonProps = rest;
    } else {
        // New order flow: lineItems + payment required (original behavior)
        const {
            recipient, locale, lineItems, payment, appearance, metadata,
            onClick: _onClick, className: _className, children: _children, ...rest
        } = props as CrossmintHostedCheckoutV3Props & JSX.IntrinsicElements["button"];
        customProps = { recipient, locale, lineItems, payment, appearance, metadata };
        onClick = _onClick;
        className = _className;
        children = _children;
        restButtonProps = rest;
    }

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
