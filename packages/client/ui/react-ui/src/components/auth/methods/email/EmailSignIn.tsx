import { type FormEvent, useState } from "react";
import Color from "color";

import { Spinner } from "@/components/common/Spinner";
import { classNames } from "@/utils/classNames";
import { AlertIcon } from "../../../../icons/alert";
import { isEmailValid } from "@crossmint/common-sdk-auth";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import type { OtpEmailPayload } from "@/types/auth";
import { useCrossmintAuth } from "@/hooks/useCrossmintAuth";
import { ContinueWithGoogle } from "../google/ContinueWithGoogle";
import { tw } from "@/twind-instance";

export function EmailSignIn({ setOtpEmailData }: { setOtpEmailData: (data: OtpEmailPayload) => void }) {
    const { crossmintAuth } = useCrossmintAuth();
    const { appearance, defaultEmail, setStep, setError, loginMethods } = useAuthForm();

    const [emailInput, setEmailInput] = useState(defaultEmail ?? "");
    const [emailError, setEmailError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    /** Continue with google button will only show under the following conditions:
     * 1. Email is a gmail address
     * 2. Email DOES NOT contain a "+" character
     * 3. Email is valid
     */
    const showGoogleContinueButton =
        emailInput.toLowerCase().includes("@gmail.com") &&
        !emailInput.toLowerCase().includes("+") &&
        isEmailValid(emailInput) &&
        !isLoading &&
        loginMethods.includes("google");

    async function handleOnSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        setIsLoading(true);

        try {
            const trimmedEmailInput = emailInput.trim().toLowerCase();
            const emailSignInRes = (await crossmintAuth?.sendEmailOtp(trimmedEmailInput)) as { emailId: string };

            setOtpEmailData({ email: trimmedEmailInput, emailId: emailSignInRes.emailId });
            setStep("otp");
        } catch (_e: unknown) {
            setIsLoading(false);
            setError("Failed to send email. Please try again or contact support.");
        }
    }

    return (
        <>
            <div className={tw("flex flex-col items-start justify-start w-full rounded-lg")}>
                <div className={tw("w-full")}>
                    <label
                        className={tw("text-cm-text-primary block mb-[5px]")}
                        style={{ color: appearance?.colors?.textPrimary }}
                    >
                        Email
                    </label>
                    <form
                        role="form"
                        className={tw("relative")}
                        onSubmit={(e) => {
                            // Prevent form submission if Google button should be shown
                            if (showGoogleContinueButton) {
                                e.preventDefault();
                                return;
                            }
                            // Otherwise proceed with normal submission if email is valid
                            if (isEmailValid(emailInput)) {
                                handleOnSubmit(e);
                            } else {
                                e.preventDefault();
                            }
                        }}
                        noValidate // we want to handle validation ourselves
                    >
                        <label htmlFor="emailInput" className={tw("sr-only")}>
                            Email
                        </label>
                        <input
                            className={classNames(
                                "flex-grow text-cm-text-primary text-left pl-[16px] h-[58px] w-full border border-cm-border rounded-xl bg-cm-background-primary placeholder:text-md",
                                "transition-none duration-200 ease-in-out",
                                "focus:outline-none focus-ring-custom", // Add focus ring
                                "placeholder:[color:var(--placeholder-color)]",
                                emailError ? "border-red-500" : "",
                                showGoogleContinueButton ? "pr-[132px]" : "pr-[80px]"
                            )}
                            style={{
                                color: appearance?.colors?.textPrimary,
                                borderRadius: appearance?.borderRadius,
                                borderColor: emailError ? appearance?.colors?.danger : appearance?.colors?.border,
                                backgroundColor: appearance?.colors?.inputBackground,
                                // @ts-expect-error Add custom placeholder & ring color to tailwind
                                "--placeholder-color": appearance?.colors?.textSecondary ?? "#67797F",
                                "--focus-ring-color": new Color(appearance?.colors?.accent ?? "#04AA6D")
                                    .alpha(0.18)
                                    .toString(),
                            }}
                            type="email"
                            placeholder="your@email.com"
                            value={emailInput}
                            onChange={(e) => {
                                setEmailInput(e.target.value);
                                setEmailError("");
                                setError(null);
                            }}
                            readOnly={isLoading}
                            aria-describedby="emailError"
                        />
                        <div className={tw("absolute inset-y-0 right-0 flex items-center pr-4")}>
                            {emailError && <AlertIcon customColor={appearance?.colors?.danger} />}
                            {isLoading && (
                                <Spinner
                                    style={{
                                        color: appearance?.colors?.textSecondary,
                                        fill: appearance?.colors?.textPrimary,
                                    }}
                                />
                            )}
                            {showGoogleContinueButton ? (
                                <ContinueWithGoogle emailInput={emailInput} appearance={appearance} />
                            ) : !emailError && !isLoading ? (
                                <button
                                    type="submit"
                                    className={classNames(
                                        "font-medium text-cm-accent text-nowrap bg-cm-background-primary",
                                        !isEmailValid(emailInput) ? "!cursor-not-allowed opacity-60" : "cursor-pointer"
                                    )}
                                    style={{
                                        color: appearance?.colors?.accent,
                                        backgroundColor: appearance?.colors?.inputBackground,
                                    }}
                                    disabled={!isEmailValid(emailInput) || isLoading}
                                >
                                    Submit
                                </button>
                            ) : null}
                        </div>
                    </form>
                    {emailError && <p className={tw("text-xs text-red-500 mb-2 pt-2")}>{emailError}</p>}
                </div>
            </div>
        </>
    );
}
