import React, { MouseEvent, useMemo } from "react";
import { useState } from "react";

import { clientNames, crossmintModalService, crossmintPayButtonService } from "@crossmint/client-sdk-base";

import { formatProps, useStyles } from "./styles";
import { CrossmintPayButtonReactProps } from "./types";
import useEnvironment from "./useEnvironment";
import { LIB_VERSION } from "./version";

export function CrossmintPayButton(buttonProps: CrossmintPayButtonReactProps) {
    const {
        className,
        disabled,
        onClick,
        style,
        tabIndex,
        theme = "dark",
        mintTo,
        emailTo,
        listingId,
        auctionId,
        showOverlay = true,
        mintConfig,
        whPassThroughArgs,
        environment,
        paymentMethod,
        preferredSigninMethod,
        dismissOverlayOnClick,
        prepay,
        locale = "en-US",
        currency = "usd",
        successCallbackURL = "",
        failureCallbackURL = "",
        loginEmail = "",
        projectId,
        getButtonText,
        checkoutProps = {
            experimental: false,
            display: "same-tab",
            delivery: "all",
            paymentMethods: ["fiat", "ETH", "SOL"],
        },
        ...props
    } = buttonProps;

    const collectionId = "clientId" in props ? props.clientId : props.collectionId;

    const [connecting, setConnecting] = useState(false);
    const { isServerSideRendering } = useEnvironment();

    const { connect } = crossmintModalService({
        clientId: collectionId,
        projectId,
        showOverlay,
        dismissOverlayOnClick,
        setConnecting,
        libVersion: LIB_VERSION,
        environment,
        clientName: clientNames.reactUi,
        locale,
        currency,
        successCallbackURL,
        failureCallbackURL,
        loginEmail,
    });

    const { getButtonText: getButtonTextInternal, handleClick } = crossmintPayButtonService({
        onClick,
        connecting,
        paymentMethod,
        locale,
        checkoutProps
    });

    const _handleClick = (event: MouseEvent<HTMLButtonElement>) =>
        handleClick(event, () => {
            connect(
                mintConfig,
                mintTo,
                emailTo,
                listingId,
                whPassThroughArgs,
                paymentMethod,
                preferredSigninMethod,
                prepay,
                checkoutProps
            );
        });

    const classes = useStyles(formatProps(theme));

    const content = useMemo(() => {
        return (
            <span className={classes.crossmintParagraph} role="button-paragraph">
                {getButtonText != null
                    ? getButtonText(connecting, paymentMethod || "fiat")
                    : getButtonTextInternal(connecting)}
            </span>
        );
    }, [connecting, getButtonText, paymentMethod]);

    return (
        <>
            {!isServerSideRendering && (
                <button
                    className={`${classes.crossmintButton} ${className || ""}`}
                    disabled={disabled}
                    onClick={_handleClick}
                    style={{ ...style }}
                    tabIndex={tabIndex}
                >
                    <img
                        className={classes.crossmintImg}
                        src="https://www.crossmint.io/assets/crossmint/logo.svg"
                        alt="Crossmint logo"
                    />
                    {content}
                </button>
            )}
        </>
    );
}
