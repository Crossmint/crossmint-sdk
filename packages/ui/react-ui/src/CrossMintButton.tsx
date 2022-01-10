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

    return (
        <button
            className={`client-sdk-button-trigger client-sdk-button-trigger-${theme}`}
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
