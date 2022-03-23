import React, { FC, MouseEventHandler, useMemo, useCallback, useState, useEffect } from "react";
import { useStyles, formatProps } from "./styles";
import { CrossmintStatusButtonReactProps } from "./types";
import { isClientSide } from "./utils";
import { baseUrls, onboardingRequestStatusResponse, crossmintStatusService } from "@crossmint/client-sdk-base";
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
