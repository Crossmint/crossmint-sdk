import { mintingContractTypes, crossmintPayButtonService } from "@crossmint/client-sdk-base";
import React, { FC, MouseEvent, useMemo, useEffect } from "react";
import { useStyles, formatProps } from "./styles";
import { isClientSide } from "./utils";
import { CrossmintPayButtonReactProps } from "./types";
import {
    crossmintModalService,
    onboardingRequestStatusResponse,
    crossmintStatusService,
} from "@crossmint/client-sdk-base";
import { useState } from "react";
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
    });

    const { connect } = crossmintModalService({
        clientId,
        showOverlay,
        setConnecting,
        libVersion: LIB_VERSION,
        environment,
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
            connect(mintConfig, collectionTitle, collectionDescription, collectionPhoto, mintTo, emailTo, listingId);
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
