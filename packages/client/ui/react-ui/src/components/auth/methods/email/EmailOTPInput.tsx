import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/common/InputOTP";
import { useAuthSignIn } from "@/hooks/useAuthSignIn";
import { EmailOtpIcon } from "@/icons/emailOTP";
import { useState } from "react";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { AuthFormBackButton } from "../../AuthForm";

export const EMAIL_VERIFICATION_TOKEN_LENGTH = 6;

export function EmailOTPInput() {
    const { appearance, baseUrl, apiKey, fetchAuthMaterial, setDialogOpen, setStep, otpEmailData, setOtpEmailData } =
        useAuthForm();
    const { onConfirmEmailOtp } = useAuthSignIn();

    const [token, setToken] = useState("");
    const [hasError, setHasError] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleOnSubmit = async () => {
        setLoading(true);
        try {
            const oneTimeSecret = await onConfirmEmailOtp(otpEmailData?.email ?? "", otpEmailData?.state ?? "", token, {
                baseUrl,
                apiKey,
            });

            fetchAuthMaterial(oneTimeSecret as string);
            setDialogOpen(false);
        } catch (e) {
            console.error("Error signing in via email ", e);
            setHasError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleOnBack = () => {
        setStep("initial");
        setOtpEmailData(null);
    };

    return (
        <div>
            <AuthFormBackButton onClick={handleOnBack} iconColor={appearance?.colors?.textPrimary} />

            <div
                className="flex flex-col items-center justify-start w-full bg-console-bg-default"
                style={{ backgroundColor: appearance?.colors?.background }}
            >
                <div className="relative left-3">
                    <EmailOtpIcon
                        customAccentColor={appearance?.colors?.accent}
                        customButtonBackgroundColor={appearance?.colors?.buttonBackground}
                        customBackgroundColor={appearance?.colors?.background}
                    />
                </div>
                <p
                    className="text-base font-normal mt-4 mb-1 text-center text-[#67797F]"
                    style={{ color: appearance?.colors?.textPrimary }}
                >
                    {"Check your email"}
                </p>
                <p className="text-center px-4" style={{ color: appearance?.colors?.textSecondary }}>
                    {"A temporary login code has been sent to your email"}
                </p>
                <div className="py-8">
                    <InputOTP
                        maxLength={EMAIL_VERIFICATION_TOKEN_LENGTH}
                        value={token}
                        onChange={(val) => {
                            setToken(val);
                            setHasError(false);
                        }}
                        onComplete={handleOnSubmit}
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

                <p className="text-sm leading-tight text-center">
                    <span style={{ color: appearance?.colors?.textSecondary }}>
                        Can't find the email? Check spam folder or contact
                    </span>{" "}
                    <a
                        key="resend-email-link"
                        className="transition-opacity duration-150 text-link hover:opacity-70"
                        style={{ color: appearance?.colors?.textLink }}
                        href="mailto:support@crossmint.io"
                    >
                        support@crossmint.io
                    </a>
                </p>
            </div>
        </div>
    );
}
