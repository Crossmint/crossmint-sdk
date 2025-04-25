import type React from "react";
import { useState } from "react";
import Color from "color";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { isEmailValid } from "@crossmint/common-sdk-auth";

import { Spinner } from "@/components/common/Spinner";
import { classNames } from "@/utils/classNames";
import { AlertIcon } from "@/icons/alert";

interface EmailInputProps {
    email: string;
    setEmail: (email: string) => void;
    onSubmitEmail: (email: string) => Promise<void>;
    appearance?: UIConfig;
}

export function EmailInput({ email, setEmail, onSubmitEmail, appearance }: EmailInputProps) {
    const [emailError, setEmailError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleOnSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isEmailValid(email)) {
            return;
        }

        setIsLoading(true);
        try {
            await onSubmitEmail(email);
        } catch (error) {
            console.error("Error submitting email:", error);
            setEmailError("Failed to submit email. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="flex flex-col items-start justify-start w-full rounded-lg">
                <div className="w-full">
                    <label
                        className="text-cm-text-primary block mb-[5px]"
                        style={{ color: appearance?.colors?.textPrimary }}
                    >
                        Email
                    </label>
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
                                "flex-grow text-cm-text-primary text-left pl-[16px] h-[58px] w-full border border-cm-border rounded-xl bg-cm-background-primary placeholder:text-md",
                                "transition-none duration-200 ease-in-out",
                                "focus:outline-none focus-ring-custom", // Add focus ring
                                "placeholder:[color:var(--placeholder-color)]",
                                emailError ? "border-red-500" : ""
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
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setEmailError("");
                            }}
                            readOnly={isLoading}
                            aria-describedby="emailError"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                            {emailError && <AlertIcon customColor={appearance?.colors?.danger} />}
                            {isLoading ? (
                                <Spinner
                                    style={{
                                        color: appearance?.colors?.textSecondary,
                                        fill: appearance?.colors?.textPrimary,
                                    }}
                                />
                            ) : (
                                <button
                                    type="submit"
                                    className={classNames(
                                        "font-medium text-cm-accent text-nowrap bg-cm-background-primary",
                                        !isEmailValid(email) ? "!cursor-not-allowed opacity-60" : "cursor-pointer"
                                    )}
                                    style={{
                                        color: appearance?.colors?.accent,
                                        backgroundColor: appearance?.colors?.inputBackground,
                                    }}
                                    disabled={!isEmailValid(email) || isLoading}
                                >
                                    Submit
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
