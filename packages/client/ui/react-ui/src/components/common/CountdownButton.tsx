import { useState, useEffect } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import styled from "@emotion/styled";
import { theme, globalReset } from "@/styles";

type CountdownButtonProps = {
    initialSeconds: number;
    appearance?: UIConfig;
    countdownText: (seconds: number) => string;
    countdownCompleteText: string;
    handleOnClick: () => Promise<void>;
};

const StyledButton = styled.button<{
    appearance?: UIConfig;
    canResend?: boolean;
    isLoading?: boolean;
}>`
    ${globalReset}
    
    /* Button styles */
    font-size: 14px;
    line-height: 1.3;
    text-align: center;
    margin-top: 8px;
    transition: opacity 200ms ease;
    border: none;
    background: none;
    border-radius: 4px;
    
    /* Conditional styling based on state */
    cursor: ${(props) => (props.canResend && !props.isLoading ? "pointer" : "default")};
    opacity: ${(props) => (props.canResend && !props.isLoading ? 1 : 0.5)};
    color: ${(props) => {
        if (props.canResend && !props.isLoading) {
            return props.appearance?.colors?.textLink || "#1A73E8";
        }
        return props.appearance?.colors?.textSecondary || "#67797F";
    }};
    
    /* Hover state for active button */
    &:hover {
        opacity: ${(props) => (props.canResend && !props.isLoading ? 0.8 : 0.5)};
    }

    /* Tab style for button (for accessibility) */
    &:focus-visible {
        outline: 2px solid ${(props) => props.appearance?.colors?.accent || theme["cm-accent"]};
        outline-offset: 2px;
    }
    
    /* Disabled state */
    &:disabled {
        cursor: default;
    }
`;

export function CountdownButton({
    initialSeconds,
    appearance,
    countdownText,
    countdownCompleteText,
    handleOnClick,
}: CountdownButtonProps) {
    const [seconds, setSeconds] = useState(initialSeconds);
    const [canResend, setCanResend] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;

        if (seconds > 0) {
            setCanResend(false);
            timer = setInterval(() => {
                setSeconds((prev) => {
                    if (prev <= 1) {
                        setCanResend(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timer != null) {
                clearInterval(timer);
            }
        };
    }, [seconds]);

    const startCountdown = () => {
        if (!canResend) {
            return;
        }

        const backoffDelay = Math.min(initialSeconds * Math.pow(2, retryCount), 240); // Exponential backoff until 4 minutes
        setSeconds(backoffDelay);
        setRetryCount((prev) => prev + 1);
    };

    const handleClick = async () => {
        if (canResend && seconds === 0 && !isLoading) {
            setIsLoading(true);
            await handleOnClick();
            startCountdown();
            setIsLoading(false);
        }
    };

    return (
        <StyledButton
            onClick={handleClick}
            disabled={!canResend || isLoading}
            appearance={appearance}
            canResend={canResend}
            isLoading={isLoading}
        >
            {canResend ? countdownCompleteText : countdownText(seconds)}
        </StyledButton>
    );
}
