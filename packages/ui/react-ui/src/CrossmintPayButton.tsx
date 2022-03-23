import { mintingContractTypes, crossmintPayButtonService } from "@crossmint/client-sdk-base";
import React, { FC, MouseEventHandler, useMemo, useCallback, useEffect } from "react";
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
    development = false,
    auctionId,
    hideMintOnInactiveClient = false,
    showOverlay = true,
    mintConfig = defaultMintConfig,
    webhookPassedArgs,
    ...props
}) => {
    const [connecting, setConnecting] = useState(false);
    const [status, setStatus] = useState(onboardingRequestStatusResponse.WAITING_SUBMISSION);

    const { fetchClientIntegration } = crossmintStatusService({
        libVersion: LIB_VERSION,
        clientId,
        development,
        auctionId,
        mintConfig,
        setStatus,
    });

    const { connect } = crossmintModalService({
        development,
        clientId,
        showOverlay,
        setConnecting,
        libVersion: LIB_VERSION,
    });

    const { checkProps, getButtonText, shouldHideButton } = crossmintPayButtonService();

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

    const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
        (event) => {
            if (onClick) onClick(event);

            if (connecting) return;

            if (!event.defaultPrevented) {
                connect(
                    mintConfig,
                    collectionTitle,
                    collectionDescription,
                    collectionPhoto,
                    mintTo,
                    emailTo,
                    listingId
                );
            }
        },
        [onClick]
    );

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
                    onClick={handleClick}
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
