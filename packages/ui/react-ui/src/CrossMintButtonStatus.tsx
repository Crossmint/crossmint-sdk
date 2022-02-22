import React, { CSSProperties, FC, MouseEvent, MouseEventHandler, useMemo, useCallback } from "react";
import useCrossMintStatus, { OnboardingRequestStatusResponse } from "./hooks/useCrossMintStatus";
import { Button, Img, Paragraph } from "./styles/index";

export interface StatusButtonProps {
    className?: string;
    disabled?: boolean;
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    style?: CSSProperties;
    tabIndex?: number;
    clientId: string;
    auctionId?: string;
    theme?: "light" | "dark";
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
    ...props
}) => {
    const status = useCrossMintStatus({ clientId });

    const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
        (event) => {
            if (onClick) onClick(event);

            if (status === OnboardingRequestStatusResponse.WAITING_SUBMISSION) {
                window.open(
                    `https://www.crossmint.io/developers/onboarding${clientId ? `?clientId=${clientId}` : ""}${
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
                return <Paragraph>Invalid clientId</Paragraph>;
            case OnboardingRequestStatusResponse.WAITING_SUBMISSION:
                return <Paragraph>Click here to setup CrossMint</Paragraph>;
            case OnboardingRequestStatusResponse.PENDING:
                return <Paragraph>Your application is under review</Paragraph>;
            case OnboardingRequestStatusResponse.ACCEPTED:
                return <Paragraph>You're good to go!</Paragraph>;
            case OnboardingRequestStatusResponse.REJECTED:
                return <Paragraph>Your application was rejected</Paragraph>;
        }
    }, [status]);

    return (
        <Button
            className={className}
            theme={theme}
            disabled={status !== OnboardingRequestStatusResponse.WAITING_SUBMISSION}
            onClick={handleClick}
            style={{ ...style }}
            tabIndex={tabIndex}
            {...props}
        >
            <Img
                className="client-sdk-button-icon"
                src="https://www.crossmint.io/assets/crossmint/logo.png"
                alt="Crossmint logo"
            />
            {content}
        </Button>
    );
};
