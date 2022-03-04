import React, { FC, MouseEventHandler, useMemo, useCallback } from "react";
import useCrossmintStatus from "./hooks/useCrossmintStatus";
import { useStyles, formatProps } from "./styles";
import { CrossmintStatusButtonReactProps } from "./types";
import { isClientSide } from "./utils";
import { baseUrls, onboardingRequestStatusResponse } from "@crossmint/client-sdk-base";

export const CrossmintStatusButton: FC<CrossmintStatusButtonReactProps> = ({
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
    const status = useCrossmintStatus({ clientId, development });

    const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
        (event) => {
            if (onClick) onClick(event);

            if (status === onboardingRequestStatusResponse.WAITING_SUBMISSION) {
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
            case onboardingRequestStatusResponse.INVALID:
                return <p className={classes.crossmintParagraph}>Invalid clientId</p>;
            case onboardingRequestStatusResponse.WAITING_SUBMISSION:
                return <p className={classes.crossmintParagraph}>Click here to setup Crossmint</p>;
            case onboardingRequestStatusResponse.PENDING:
                return <p className={classes.crossmintParagraph}>Your application is under review</p>;
            case onboardingRequestStatusResponse.ACCEPTED:
                return <p className={classes.crossmintParagraph}>You're good to go!</p>;
            case onboardingRequestStatusResponse.REJECTED:
                return <p className={classes.crossmintParagraph}>Your application was rejected</p>;
        }
    }, [status]);

    return (
        <>
            {isClientSide && (
                <button
                    className={`${classes.crossmintButton} ${className}`}
                    disabled={status !== onboardingRequestStatusResponse.WAITING_SUBMISSION}
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
            )}
        </>
    );
};
