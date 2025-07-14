import { CrossmintLogoV2 } from "@/components/common/CrossmintLogoV2/CrossmintLogoV2";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import {
    crossmintHostedCheckoutV3Service,
    crossmintHostedCheckoutV3StylesService,
    type CrossmintHostedCheckoutV3Props,
} from "@crossmint/client-sdk-base";
import clsx from "clsx";
import { type MouseEvent, type JSX, useEffect, useState } from "react";

export type CrossmintHostedCheckoutV3ReactProps = CrossmintHostedCheckoutV3Props & JSX.IntrinsicElements["button"];

export function CrossmintHostedCheckout(props: CrossmintHostedCheckoutV3ReactProps) {
    const [didInjectCss, setDidInjectCss] = useState(false);

    const { crossmint } = useCrossmint();
    const apiClient = createCrossmintApiClient(crossmint);

    // separate custom props from jsx button props
    const { recipient, locale, lineItems, payment, appearance, metadata, ...buttonProps } = props;
    const customProps: CrossmintHostedCheckoutV3Props = {
        recipient,
        locale,
        lineItems,
        payment,
        appearance,
        metadata,
    };

    const hostedCheckoutService = crossmintHostedCheckoutV3Service({ apiClient, hostedCheckoutProps: customProps });
    const stylesService = crossmintHostedCheckoutV3StylesService(customProps);

    const { onClick, className, children, ...restButtonProps } = buttonProps;

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
