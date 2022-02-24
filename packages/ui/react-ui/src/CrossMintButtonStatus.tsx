import React, { CSSProperties, FC, MouseEvent, MouseEventHandler, useMemo, useCallback } from "react";
import useCrossMintStatus, { OnboardingRequestStatusResponse } from "./hooks/useCrossMintStatus";
import { useStyles, formatProps } from "./styles";
import { baseUrls } from './hooks/types'

export interface StatusButtonProps {
    className?: string;
    disabled?: boolean;
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    style?: CSSProperties;
    tabIndex?: number;
    clientId: string;
    auctionId?: string;
    theme?: "light" | "dark";
    development: boolean;
}

export const CrossMintStatusButton: FC<StatusButtonProps> = ({
    className,
    disabled,
    onClick,
    style,
    tabIndex,
    theme = "dark",
    clientId,
    auctionId,
    development = false,
    ...props
}) => {
    const status = useCrossMintStatus({ clientId, development });

    const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
        (event) => {
            if (onClick) onClick(event);

            if (status === OnboardingRequestStatusResponse.WAITING_SUBMISSION) {
                const baseUrl = development ? baseUrls.dev : baseUrls.prod;
                window.open(
                    `${baseUrl}/developers/onboarding${clientId ? `?clientId=${clientId}` : ""}${
                        auctionId ? `&auctionId=${auctionId}` : ""
                    }`,
                    "_blank"
                );
                return;
            }
        },
        [status]
    );

    const classes = useStyles(formatProps(theme));

    const content = useMemo(() => {
        switch (status) {
            case OnboardingRequestStatusResponse.INVALID:
                return <p className={classes.crossmintParagraph}>Invalid clientId</p>;
            case OnboardingRequestStatusResponse.WAITING_SUBMISSION:
                return <p className={classes.crossmintParagraph}>Click here to setup CrossMint</p>;
            case OnboardingRequestStatusResponse.PENDING:
                return <p className={classes.crossmintParagraph}>Your application is under review</p>;
            case OnboardingRequestStatusResponse.ACCEPTED:
                return <p className={classes.crossmintParagraph}>You're good to go!</p>;
            case OnboardingRequestStatusResponse.REJECTED:
                return <p className={classes.crossmintParagraph}>Your application was rejected</p>;
        }
    }, [status]);

    return (
        <button
            className={`${classes.crossmintButton} ${className}`}
            disabled={status !== OnboardingRequestStatusResponse.WAITING_SUBMISSION}
            onClick={handleClick}
            style={{ ...style }}
            tabIndex={tabIndex}
            {...props}
        >
            <img
                className={classes.crossmintImg}
                src={`${baseUrls.prod}/assets/crossmint/logo.png`}
                alt="Crossmint logo"
            />
            {content}
        </button>
    );
};
