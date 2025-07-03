import { useState } from "react";
import { CountdownButton } from "@/components/common/CountdownButton";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/common/InputOTP";
import { PhoneOtpIcon } from "@/icons/phoneOTP";

interface PhoneOTPInputProps {
    phone: string;
    onSubmitOTP: (token: string) => Promise<void>;
    onResendCode?: () => Promise<void>;
    appearance?: UIConfig;
}

export function PhoneOTPInput({ phone, onSubmitOTP, onResendCode, appearance }: PhoneOTPInputProps) {
    const [token, setToken] = useState("");
    const [hasError, setHasError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleOnSubmitOTP = async () => {
        setLoading(true);
        try {
            await onSubmitOTP(token);
            setHasError(false);
            setError(null);
        } catch (error) {
            console.error("Error confirming recovery key OTP", error);
            setError("Invalid code. Please try again.");
            setHasError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-start w-full">
            <div className="relative left-3">
                <PhoneOtpIcon
                    customAccentColor={appearance?.colors?.accent}
                    customButtonBackgroundColor={appearance?.colors?.buttonBackground}
                    customBackgroundColor={appearance?.colors?.background}
                />
            </div>
            <p
                className="text-base font-normal mt-4 mb-1 text-center text-cm-text-primary"
                style={{ color: appearance?.colors?.textPrimary }}
            >
                Check your phone
            </p>
            <p className="text-center text-cm-text-secondary px-4" style={{ color: appearance?.colors?.textSecondary }}>
                A temporary login code has been sent to {phone}
            </p>
            <div className="py-8">
                <InputOTP
                    maxLength={6}
                    value={token}
                    onChange={(val) => {
                        setToken(val);
                        setHasError(false);
                        setError(null);
                    }}
                    onComplete={handleOnSubmitOTP}
                    disabled={loading}
                    customStyles={{
                        accent: appearance?.colors?.accent ?? "#04AA6D",
                        danger: appearance?.colors?.danger ?? "#f44336",
                        border: appearance?.colors?.border ?? "#E5E7EB",
                        textPrimary: appearance?.colors?.textPrimary ?? "#909ca3",
                        buttonBackground: appearance?.colors?.buttonBackground ?? "#eff6ff",
                        inputBackground: appearance?.colors?.inputBackground ?? "#FFFFFF",
                        borderRadius: appearance?.borderRadius,
                    }}
                >
                    <InputOTPGroup>
                        <InputOTPSlot index={0} hasError={hasError} />
                        <InputOTPSlot index={1} hasError={hasError} />
                        <InputOTPSlot index={2} hasError={hasError} />
                        <InputOTPSlot index={3} hasError={hasError} />
                        <InputOTPSlot index={4} hasError={hasError} />
                        <InputOTPSlot index={5} hasError={hasError} />
                    </InputOTPGroup>
                </InputOTP>
            </div>

            {error && <div className="text-sm text-red-500 mb-4">{error}</div>}

            <div className="text-xs leading-tight text-cm-text-secondary text-center">
                <span style={{ color: appearance?.colors?.textSecondary }}>
                    Didn't receive the SMS? Check your signal.
                    {"\n"}
                    Some messages may take several minutes to arrive.
                </span>
            </div>

            {onResendCode && (
                <CountdownButton
                    initialSeconds={60}
                    appearance={appearance}
                    countdownText={(seconds) => `Re-send code in ${seconds}s`}
                    countdownCompleteText="Re-send code"
                    handleOnClick={onResendCode}
                />
            )}
        </div>
    );
}
