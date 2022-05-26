import React, { FC, MouseEventHandler, useCallback, useEffect, useMemo, useState } from "react";

import {
    baseUrls,
    clientNames,
    crossmintStatusButtonService,
    crossmintStatusService,
    onboardingRequestStatusResponse,
} from "@crossmint/client-sdk-base";

import { useStyles } from "./styles";
import { CrossmintStatusButtonReactProps } from "./types";
import useEnvironment from "./useEnvironment";
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
    const { isServerSideRendering } = useEnvironment();

    const { goToOnboarding, fetchClientIntegration } = crossmintStatusService({
        libVersion: LIB_VERSION,
        clientId,
        environment,
        platformId,
        auctionId,
        mintConfig,
        setStatus,
        clientName: clientNames.reactUi,
    });
    const { getButtonText, isButtonDisabled, handleClick } = crossmintStatusButtonService({ onClick });

    const _handleClick: MouseEventHandler<HTMLButtonElement> = (e) => handleClick(e, status, goToOnboarding);

    useEffect(() => {
        fetchClientIntegration();

        const interval = setInterval(() => {
            fetchClientIntegration();
        }, 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    // const classes = useStyles(formatProps(theme));
    const classes = useStyles();

    const content = useMemo(() => {
        return <span className={classes.crossmintParagraph}>{getButtonText(status)}</span>;
    }, [status]);

    return (
        <>
            {!isServerSideRendering && (
                <button
                    className={`${classes.crossmintButton} ${className || ""}`}
                    disabled={isButtonDisabled(status)}
                    onClick={_handleClick}
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
