import { useState, useEffect } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { classNames } from "@/utils/classNames";

type CountdownButtonProps = {
    initialSeconds: number;
    appearance?: UIConfig;
    countdownText: (seconds: number) => string;
    countdownCompleteText: string;
    handleOnClick: () => Promise<void>;
};

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
        <button
            onClick={handleClick}
            disabled={!canResend || isLoading}
            className={classNames(
                "text-sm leading-tight text-center mt-2 transition-opacity",
                canResend && !isLoading ? "cursor-pointer opacity-100" : "cursor-default opacity-50"
            )}
            style={{
                color: canResend
                    ? appearance?.colors?.textLink ?? "#1A73E8"
                    : appearance?.colors?.textSecondary ?? "#67797F",
            }}
        >
            {canResend ? countdownCompleteText : countdownText(seconds)}
        </button>
    );
}
