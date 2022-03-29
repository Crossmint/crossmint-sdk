import React, { FC, MouseEvent, useEffect, useMemo } from "react";
import { useState } from "react";

import {
    crossmintModalService,
    crossmintPayButtonService,
    crossmintStatusService,
    clientNames,
    mintingContractTypes,
    onboardingRequestStatusResponse,
} from "@crossmint/client-sdk-base";

import { formatProps, useStyles } from "./styles";
import { CrossmintPayButtonReactProps } from "./types";
import { isClientSide } from "./utils";
import { LIB_VERSION } from "./version";

const defaultMintConfig: any = {
    type: mintingContractTypes.CANDY_MACHINE,
};

export const CrossmintPayButton: FC<CrossmintPayButtonReactProps> = ({
    className,
    disabled,
    onClick,
    style,
    tabIndex,
    theme = "dark",
    collectionTitle,
    collectionDescription,
    collectionPhoto,
    mintTo,
    emailTo,
    listingId,
    clientId,
    auctionId,
    hideMintOnInactiveClient = false,
    showOverlay = true,
    mintConfig = defaultMintConfig,
    whPassThroughArgs,
    environment,
    ...props
}) => {
    const [connecting, setConnecting] = useState(false);
    const [status, setStatus] = useState(onboardingRequestStatusResponse.WAITING_SUBMISSION);

    const { fetchClientIntegration } = crossmintStatusService({
        libVersion: LIB_VERSION,
        clientId,
        environment,
        auctionId,
        mintConfig,
        setStatus,
        clientName: clientNames.reactUi,
    });

    const { connect } = crossmintModalService({
        clientId,
        showOverlay,
        setConnecting,
        libVersion: LIB_VERSION,
        environment,
        clientName: clientNames.reactUi,
    });

    const { checkProps, getButtonText, shouldHideButton, handleClick } = crossmintPayButtonService({
        onClick,
        connecting,
    });

    const [newCollectionTitle, newCollectionDescription, newCollectionPhoto] = checkProps({
        collectionTitle,
        collectionPhoto,
        collectionDescription,
    });
    collectionTitle = newCollectionTitle;
    collectionDescription = newCollectionDescription;
    collectionPhoto = newCollectionPhoto;

    useEffect(() => {
        if (hideMintOnInactiveClient) {
            fetchClientIntegration();
        }
    }, [status]);

    const _handleClick = (event: MouseEvent<HTMLButtonElement>) =>
        handleClick(event, () => {
            connect(
                mintConfig,
                collectionTitle,
                collectionDescription,
                collectionPhoto,
                mintTo,
                emailTo,
                listingId,
                whPassThroughArgs
            );
        });

    const classes = useStyles(formatProps(theme));

    const content = useMemo(() => {
        return <p className={classes.crossmintParagraph}>{getButtonText(connecting)}</p>;
    }, [connecting]);

    if (shouldHideButton({ hideMintOnInactiveClient, status })) {
        return null;
    }

    return (
        <>
            {isClientSide && (
                <button
                    className={`${classes.crossmintButton} ${className || ""}`}
                    disabled={disabled}
                    onClick={_handleClick}
                    style={{ ...style }}
                    tabIndex={tabIndex}
                    {...props}
                >
                    <img
                        className={classes.crossmintImg}
                        src="https://www.crossmint.io/assets/crossmint/logo.png"
                        alt="Crossmint logo"
                    />
                    {content}
                </button>
            )}
        </>
    );
};
