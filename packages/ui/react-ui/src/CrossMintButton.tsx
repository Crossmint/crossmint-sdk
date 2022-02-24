import React, { CSSProperties, FC, MouseEvent, MouseEventHandler, useMemo, useCallback, useState } from "react";
import useCrossMintStatus, { OnboardingRequestStatusResponse } from "./hooks/useCrossMintStatus";
import useCrossMintModal from "./hooks/useCrossMintModal";
import { useStyles, formatProps } from "./styles";
import { getIsClientSide } from "./utils";

export interface ButtonProps {
    className?: string;
    disabled?: boolean;
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    style?: CSSProperties;
    tabIndex?: number;
    theme?: "light" | "dark";
    collectionTitle?: string;
    collectionDescription?: string;
    collectionPhoto?: string;
    mintTo?: string;
    emailTo?: string;
    listingId?: string;
    auctionId?: string;
    hideMintOnInactiveClient?: boolean;
    clientId: string;
    development?: boolean;
    showOverlay?: boolean;
}

export const CrossMintButton: FC<ButtonProps> = ({
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
    ...props
}) => {
    const status = useCrossMintStatus({ clientId, development });
    const { connecting, connect } = useCrossMintModal({
        clientId,
        development,
        showOverlay,
    });

    if (collectionTitle === "<TITLE_FOR_YOUR_COLLECTION>") {
        console.warn("No collection title specified. Please add a collection title to your <CrossmintButton />");
        collectionTitle = "";
    }

    if (collectionDescription === "<DESCRIPTION_OF_YOUR_COLLECTION>") {
        console.warn(
            "No collection description specified. Please add a collection description to your <CrossmintButton />"
        );
        collectionDescription = "";
    }

    if (collectionPhoto === "<OPT_URL_TO_PHOTO_COVER>") {
        console.warn("No collection photo specified. Please add a collection photo to your <CrossmintButton />");
        collectionPhoto = "";
    }

    const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
        (event) => {
            if (onClick) onClick(event);

            if (!event.defaultPrevented) {
                connect(collectionTitle, collectionDescription, collectionPhoto, mintTo, emailTo, listingId);
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

    const isClientSide = getIsClientSide();

    return (
        <>
            {isClientSide && (
                <button
                    className={`${classes.crossmintButton} ${className}`}
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
