import { type FormEvent, useState } from "react";

import { Spinner } from "@/components/common/Spinner";
import { classNames } from "@/utils/classNames";
import { AlertIcon } from "../../../../icons/alert";
import { useAuthSignIn } from "@/hooks/useAuthSignIn";
import { isEmailValid } from "@crossmint/common-sdk-auth";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import type { OtpEmailPayload } from "@/types/auth";

export function EmailSignIn({ setOtpEmailData }: { setOtpEmailData: (data: OtpEmailPayload) => void }) {
    const { baseUrl, apiKey, appearance, setStep } = useAuthForm();
    const { onEmailSignIn } = useAuthSignIn();

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
            const emailSignInRes = (await onEmailSignIn(trimmedEmailInput, { baseUrl, apiKey })) as { emailId: string };

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
                    <p
                        className="text-sm font-inter font-medium text-cm-text-primary pb-2"
                        style={{ color: appearance?.colors?.textPrimary }}
                    >
                        Email
                    </p>
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
                                "flex-grow text-left pl-[16px] pr-[80px] h-[58px] w-full border border-cm-border rounded-xl bg-cm-background-primary placeholder:text-sm placeholder:text-opacity-60",
                                "transition-all duration-200 ease-in-out", // Add smooth transition
                                "focus:outline-none focus:ring-1 focus:ring-opacity-50", // Add focus ring
                                emailError ? "border-red-500" : ""
                            )}
                            style={{
                                color: appearance?.colors?.textPrimary,
                                borderRadius: appearance?.borderRadius,
                                borderColor: emailError ? appearance?.colors?.danger : appearance?.colors?.border,
                                backgroundColor: appearance?.colors?.inputBackground,
                                // @ts-expect-error --tw-ring-color is not recognized by typescript but gets picked up by tailwind
                                "--tw-ring-color": appearance?.colors?.accent ?? "#1A73E8",
                            }}
                            type="email"
                            placeholder={"Enter email"}
                            value={emailInput}
                            onChange={(e) => {
                                setEmailInput(e.target.value);
                                setEmailError("");
                            }}
                            readOnly={isLoading}
                            // aria-invalid={emailError != null}
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
                                    className={classNames("cursor-pointer text-nowrap")}
                                    style={{ color: appearance?.colors?.accent ?? "#1A73E8" }}
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
