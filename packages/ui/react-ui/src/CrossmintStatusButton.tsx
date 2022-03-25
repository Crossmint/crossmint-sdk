import React, { FC, MouseEventHandler, useCallback, useEffect, useMemo, useState } from "react";

import { baseUrls, crossmintStatusService, onboardingRequestStatusResponse } from "@crossmint/client-sdk-base";

import { formatProps, useStyles } from "./styles";
import { CrossmintStatusButtonReactProps } from "./types";
import { isClientSide } from "./utils";
import { LIB_VERSION } from "./version";

export const CrossmintStatusButton: FC<CrossmintStatusButtonReactProps> = ({
    className,
    disabled,
    onClick,
    style,
    tabIndex,
    theme = "dark",
    clientId,
    auctionId,
    platformId,
    mintConfig,
    environment,
    ...props
}) => {
    const [status, setStatus] = useState(onboardingRequestStatusResponse.WAITING_SUBMISSION);

    const { goToOnboarding, fetchClientIntegration, getButtonText, isButtonDisabled } = crossmintStatusService({
        libVersion: LIB_VERSION,
        clientId,
        environment,
        platformId,
        auctionId,
        mintConfig,
        setStatus,
    });

    const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
        (event) => {
            if (onClick) onClick(event);

            if (status === onboardingRequestStatusResponse.WAITING_SUBMISSION) {
                goToOnboarding();
                return;
            }
        },
        [status]
    );

    useEffect(() => {
        fetchClientIntegration();

        const interval = setInterval(() => {
            fetchClientIntegration();
        }, 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    const classes = useStyles(formatProps(theme));

    const content = useMemo(() => {
        return <p className={classes.crossmintParagraph}>{getButtonText(status)}</p>;
    }, [status]);

    return (
        <>
            {isClientSide && (
                <button
                    className={`${classes.crossmintButton} ${className || ""}`}
                    disabled={isButtonDisabled(status)}
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
