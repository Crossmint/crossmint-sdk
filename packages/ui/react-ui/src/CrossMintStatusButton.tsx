import React, { CSSProperties, FC, MouseEvent, MouseEventHandler, useMemo, useCallback } from "react";
import { OnboardingRequestStatusResponse, useCrossMintStatus } from "./useCrossMintStatus";

export interface StatusButtonProps {
    className?: string;
    disabled?: boolean;
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    style?: CSSProperties;
    tabIndex?: number;
    theme?: "light" | "dark";
}

export const CrossMintStatusButton: FC<StatusButtonProps> = ({
    className,
    disabled,
    onClick,
    style,
    tabIndex,
    theme = "dark",
    ...props
}) => {
    const { status, clientId, auctionId } = useCrossMintStatus();

    const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
        (event) => {
            if (onClick) onClick(event);

            if (status === OnboardingRequestStatusResponse.WAITING_SUBMISSION) {
                window.open(
                    `https://crossmint.io/developers/onboarding${clientId ? `?clientId=${clientId}` : ""}${
                        auctionId ? `&auctionId=${auctionId}` : ""
                    }`,
                    "_blank"
                );
                return;
            }
        },
        [status]
    );

    const content = useMemo(() => {
        switch (status) {
            case OnboardingRequestStatusResponse.INVALID:
                return <p>Invalid clientId</p>;
            case OnboardingRequestStatusResponse.WAITING_SUBMISSION:
                return <p>Click here to setup CrossMint</p>;
            case OnboardingRequestStatusResponse.PENDING:
                return <p>Your application is under review</p>;
            case OnboardingRequestStatusResponse.ACCEPTED:
                return <p>You're good to go!</p>;
            case OnboardingRequestStatusResponse.REJECTED:
                return <p>You're application was rejected</p>;
        }
    }, [status]);

    return (
        <button
            className={`client-sdk-button-trigger client-sdk-button-trigger-${theme}`}
            disabled={status !== OnboardingRequestStatusResponse.WAITING_SUBMISSION}
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
