import React, { CSSProperties, FC, MouseEvent, MouseEventHandler, useMemo, useCallback } from "react";
import { OnboardingRequestStatusResponse, useCrossMintStatus } from ".";
import { useCrossMintPopup } from "./useCrossMintPopup";

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
    ...props
}) => {
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

    const { hideMintOnInactiveClient, status } = useCrossMintStatus();

    const { connecting, connect } = useCrossMintPopup();

    const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
        (event) => {
            if (onClick) onClick(event);

            if (!event.defaultPrevented)
                connect(collectionTitle, collectionDescription, collectionPhoto, mintTo, emailTo, listingId);
        },
        [onClick]
    );

    const content = useMemo(() => {
        if (connecting) return <p>Connecting ...</p>;
        return <p>Buy with credit card</p>;
    }, [connecting]);

    if (hideMintOnInactiveClient && status !== OnboardingRequestStatusResponse.ACCEPTED) {
        return null;
    }

    const formattedClassName = `client-sdk-button-trigger client-sdk-button-trigger-${theme} ${className || ''}`;

    return (
        <button
            className={formattedClassName}
            disabled={disabled}
            onClick={handleClick}
            style={{ ...style }}
            tabIndex={tabIndex}
            {...props}
        >
            <img
                className="client-sdk-button-icon"
                src="https://www.crossmint.io/assets/crossmint/logo.png"
                alt="Crossmint logo"
            />
            {content}
        </button>
    );
};
