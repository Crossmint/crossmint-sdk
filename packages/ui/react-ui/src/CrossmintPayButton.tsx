import React, { FC, MouseEventHandler, useMemo, useCallback, useState } from "react";
import useCrossmintStatus, { OnboardingRequestStatusResponse } from "./hooks/useCrossmintStatus";
import useCrossmintModal from "./hooks/useCrossmintModal";
import { useStyles, formatProps } from "./styles";
import { isClientSide } from "./utils";
import { CrossmintPayButtonProps, mintingContractTypes } from "./types";

const defaultMintConfig: any = {
    type: mintingContractTypes.CANDY_MACHINE,
};

export const CrossmintPayButton: FC<CrossmintPayButtonProps> = ({
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
    ...props
}) => {
    const status = useCrossmintStatus({ clientId, development });
    const { connecting, connect } = useCrossmintModal({
        clientId,
        development,
        showOverlay,
    });

    if (collectionTitle === "<TITLE_FOR_YOUR_COLLECTION>") {
        console.warn("No collection title specified. Please add a collection title to your <CrossmintPayButton />");
        collectionTitle = "";
    }

    if (collectionDescription === "<DESCRIPTION_OF_YOUR_COLLECTION>") {
        console.warn(
            "No collection description specified. Please add a collection description to your <CrossmintPayButton />"
        );
        collectionDescription = "";
    }

    if (collectionPhoto === "<OPT_URL_TO_PHOTO_COVER>") {
        console.warn("No collection photo specified. Please add a collection photo to your <CrossmintPayButton />");
        collectionPhoto = "";
    }

    const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
        (event) => {
            if (onClick) onClick(event);

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
        if (connecting) return <p className={classes.crossmintParagraph}>Connecting ...</p>;
        return <p className={classes.crossmintParagraph}>Buy with credit card</p>;
    }, [connecting]);

    if (hideMintOnInactiveClient && status !== OnboardingRequestStatusResponse.ACCEPTED) {
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
