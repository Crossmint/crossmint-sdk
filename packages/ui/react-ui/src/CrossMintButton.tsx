import React, { CSSProperties, FC, MouseEvent, MouseEventHandler, useMemo, useCallback } from "react";
import { useCrossMintPopup } from "./useCrossMintPopup";

export interface ButtonProps {
    candyMachineId: string;
    className?: string;
    disabled?: boolean;
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    style?: CSSProperties;
    tabIndex?: number;
    theme?: "light" | "dark";
    collectionTitle?: string;
    collectionDescription?: string;
    collectionPhoto?: string;
}

export const CrossMintButton: FC<ButtonProps> = ({
    candyMachineId,
    className,
    disabled,
    onClick,
    style,
    tabIndex,
    theme = "dark",
    collectionTitle,
    collectionDescription,
    collectionPhoto,
    ...props
}) => {
    const { connecting, connect } = useCrossMintPopup();

    const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
        (event) => {
            if (onClick) onClick(event);

            if (!event.defaultPrevented)
                connect(candyMachineId, collectionTitle, collectionDescription, collectionPhoto);
        },
        [onClick]
    );

    const content = useMemo(() => {
        if (connecting) return <p>Connecting ...</p>;
        return <p>Buy with credit card</p>;
    }, [connecting]);

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
