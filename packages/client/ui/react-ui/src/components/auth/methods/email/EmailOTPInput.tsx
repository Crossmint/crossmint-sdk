import { useState } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/common/InputOTP";
import { EmailOtpIcon } from "@/icons/emailOTP";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import type { OtpEmailPayload } from "@/types/auth";
import { AuthFormBackButton } from "../../AuthFormBackButton";
import { useCrossmintAuth } from "@/hooks/useCrossmintAuth";
import { CountdownButton } from "@/components/common/CountdownButton";
import { tw } from "@/twind-instance";

export const EMAIL_VERIFICATION_TOKEN_LENGTH = 6;

export function EmailOTPInput({
    otpEmailData,
    setOtpEmailData,
}: { otpEmailData: OtpEmailPayload | null; setOtpEmailData: (data: OtpEmailPayload | null) => void }) {
    const { crossmintAuth } = useCrossmintAuth();
    const { appearance, setDialogOpen, setStep, setError } = useAuthForm();

    const [token, setToken] = useState("");
    const [hasError, setHasError] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleOnSubmitOTP = async () => {
        setLoading(true);
        try {
            const oneTimeSecret = await crossmintAuth?.confirmEmailOtp(
                otpEmailData?.email ?? "",
                otpEmailData?.emailId ?? "",
                token
            );

            await crossmintAuth?.handleRefreshAuthMaterial(oneTimeSecret as string);
            setDialogOpen(false, true);
            setStep("initial");
        } catch (error) {
            console.error("Error confirming email OTP", error);
            setError("Invalid code. Please try again.");
            setHasError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleOnResendCode = async () => {
        try {
            await crossmintAuth?.sendEmailOtp(otpEmailData?.email ?? "");
        } catch (_e: unknown) {
            setError("Failed to resend code. Please try again.");
        }
    };

    const handleOnBack = () => {
        setStep("initial");
        setOtpEmailData(null);
    };

    return (
        <div>
            <AuthFormBackButton
                onClick={handleOnBack}
                iconColor={appearance?.colors?.textPrimary}
                ringColor={appearance?.colors?.accent}
            />

            <div className={tw("flex flex-col items-center justify-start w-full")}>
                <div className={tw("relative left-3")}>
                    <EmailOtpIcon
                        customAccentColor={appearance?.colors?.accent}
                        customButtonBackgroundColor={appearance?.colors?.buttonBackground}
                        customBackgroundColor={appearance?.colors?.background}
                    />
                </div>
                <p
                    className={tw("text-base font-normal mt-4 mb-1 text-center text-cm-text-primary")}
                    style={{ color: appearance?.colors?.textPrimary }}
                >
                    {"Check your email"}
                </p>
                <p
                    className={tw("text-center text-cm-text-secondary px-4")}
                    style={{ color: appearance?.colors?.textSecondary }}
                >
                    A temporary login code has been sent to{" "}
                    {otpEmailData?.email ? otpEmailData.email : "your email address"}
                </p>
                <div className={tw("py-8")}>
                    <InputOTP
                        maxLength={EMAIL_VERIFICATION_TOKEN_LENGTH}
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

                <div className={tw("text-xs leading-tight text-cm-text-secondary text-center")}>
                    <span style={{ color: appearance?.colors?.textSecondary }}>
                        Can't find the email? Check spam folder.
                        {"\n"}
                        Some emails may take several minutes to arrive.
                    </span>
                </div>

                <CountdownButton
                    initialSeconds={60}
                    appearance={appearance}
                    countdownText={(seconds) => `Re-send code in ${seconds}s`}
                    countdownCompleteText="Re-send code"
                    handleOnClick={handleOnResendCode}
                />
            </div>
        </div>
    );
}
