import type React from "react";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { EmailAuthFlow } from "./methods/email/EmailAuthFlow";
import { Divider } from "../common/Divider";
import { GoogleSignIn } from "./methods/google/GoogleSignIn";
import { FarcasterSignIn } from "./methods/farcaster/FarcasterSignIn";
import { PoweredByCrossmint } from "../common/PoweredByCrossmint";
import { FarcasterProvider } from "../../providers/auth/FarcasterProvider";
import { DiscordSignIn } from "./methods/discord/DiscordSignIn";
import { classNames } from "@/utils/classNames";
import { LeftArrowIcon } from "@/icons/leftArrow";

export function AuthForm() {
    const { step, appearance, baseUrl, loginMethods } = useAuthForm();

    return (
        <div className="flex flex-col gap-4 max-w-[448px]">
            {step === "initial" ? (
                <div>
                    <h1
                        className="text-2xl font-semibold text-cm-text-primary"
                        style={{ color: appearance?.colors?.textPrimary }}
                    >
                        Sign In
                    </h1>
                    <p
                        className="text-base font-normal mb-5 text-cm-text-secondary"
                        style={{ color: appearance?.colors?.textSecondary }}
                    >
                        Sign in using one of the options below
                    </p>
                </div>
            ) : null}

            {loginMethods.includes("email") ? (
                <>
                    <EmailAuthFlow />
                    {loginMethods.length > 1 ? <Divider appearance={appearance} text="OR" /> : null}
                </>
            ) : null}

            {loginMethods.includes("google") ? <GoogleSignIn /> : null}
            {loginMethods.includes("farcaster") ? (
                <FarcasterProvider baseUrl={baseUrl}>
                    <FarcasterSignIn />
                </FarcasterProvider>
            ) : null}

            {loginMethods.includes("discord") ? <DiscordSignIn /> : null}

            {step === "initial" || step === "otp" ? (
                <PoweredByCrossmint className="justify-center" color={appearance?.colors?.textSecondary ?? "#A4AFB2"} />
            ) : null}
        </div>
    );
}

export const AuthFormBackButton = ({
    className,
    iconColor,
    ringColor,
    ...props
}: React.HTMLAttributes<HTMLButtonElement> & { iconColor?: string; ringColor?: string }) => {
    return (
        <button
            className={classNames(
                "absolute rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-cm-ring focus:ring-offset-2 disabled:pointer-events-none",
                className
            )}
            style={{
                // @ts-expect-error --tw-ring-color is not recognized by typescript but gets picked up by tailwind
                "--tw-ring-color": ringColor ?? "#1A73E8",
            }}
            {...props}
        >
            <LeftArrowIcon className="w-6 h-6" style={{ color: iconColor }} />
        </button>
    );
};