import { type FormEvent, useState } from "react";
import Color from "color";

import { Spinner } from "@/components/common/Spinner";
import { classNames } from "@/utils/classNames";
import { AlertIcon } from "../../../../icons/alert";
import { isEmailValid } from "@crossmint/common-sdk-auth";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import type { OtpEmailPayload } from "@/types/auth";
import { useCrossmintAuth } from "@/hooks/useCrossmintAuth";

export function EmailSignIn({ setOtpEmailData }: { setOtpEmailData: (data: OtpEmailPayload) => void }) {
    const { crossmintAuth } = useCrossmintAuth();
    const { appearance, setStep, setError } = useAuthForm();

    const [emailInput, setEmailInput] = useState("");
    const [emailError, setEmailError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleOnSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!isEmailValid(emailInput)) {
            setEmailError("Please enter a valid email address");
            return;
        }

        setIsLoading(true);

        try {
            const trimmedEmailInput = emailInput.trim().toLowerCase();
            const emailSignInRes = (await crossmintAuth?.sendEmailOtp(trimmedEmailInput)) as { emailId: string };

            setOtpEmailData({ email: trimmedEmailInput, emailId: emailSignInRes.emailId });
            setStep("otp");
        } catch (_e: unknown) {
            setIsLoading(false);
            setEmailError("Failed to send email. Please try again or contact support.");
        }
    }

    return (
        <>
            <div className="flex flex-col items-start justify-start w-full rounded-lg">
                <div className="w-full">
                    <form
                        role="form"
                        className="relative"
                        onSubmit={handleOnSubmit}
                        noValidate // we want to handle validation ourselves
                    >
                        <label htmlFor="emailInput" className="sr-only">
                            Email
                        </label>
                        <input
                            className={classNames(
                                "flex-grow text-cm-text-secondary text-left pl-[16px] pr-[80px] h-[58px] w-full border border-cm-border rounded-xl bg-cm-background-primary placeholder:text-sm placeholder:text-opacity-60",
                                "transition-none duration-200 ease-in-out",
                                "focus:outline-none focus-ring-custom", // Add focus ring
                                emailError ? "border-red-500" : ""
                            )}
                            style={{
                                color: appearance?.colors?.textPrimary,
                                borderRadius: appearance?.borderRadius,
                                borderColor: emailError ? appearance?.colors?.danger : appearance?.colors?.border,
                                backgroundColor: appearance?.colors?.inputBackground,
                                // @ts-expect-error Add custom ring color to tailwind
                                "--focus-ring-color": new Color(appearance?.colors?.accent ?? "#04AA6D")
                                    .alpha(0.18)
                                    .toString(),
                            }}
                            type="email"
                            placeholder="Enter email"
                            value={emailInput}
                            onChange={(e) => {
                                setEmailInput(e.target.value);
                                setEmailError("");
                                setError(null);
                            }}
                            readOnly={isLoading}
                            aria-describedby="emailError"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                            {emailError && <AlertIcon customColor={appearance?.colors?.danger} />}
                            {isLoading && (
                                <Spinner
                                    style={{
                                        color: appearance?.colors?.textSecondary,
                                        fill: appearance?.colors?.textPrimary,
                                    }}
                                />
                            )}
                            {!emailError && !isLoading && (
                                <button
                                    type="submit"
                                    className={classNames("cursor-pointer font-medium text-cm-accent text-nowrap")}
                                    style={{ color: appearance?.colors?.accent }}
                                    disabled={!emailInput}
                                >
                                    Sign in
                                </button>
                            )}
                        </div>
                    </form>
                    {emailError && <p className="text-xs text-red-500 mb-2 pt-2">{emailError}</p>}
                </div>
            </div>
        </>
    );
}
