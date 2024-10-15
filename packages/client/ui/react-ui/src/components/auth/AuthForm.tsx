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
    const { step, appearance, baseUrl } = useAuthForm();

    return (
        <div className="flex flex-col gap-4 max-w-[396px]">
            {step === "initial" ? (
                <div>
                    <h1
                        className="text-2xl font-semibold text-custom-text-primary"
                        style={{ color: appearance?.colors?.textPrimary }}
                    >
                        Sign In
                    </h1>
                    <p
                        className="text-base font-normal mb-5 text-[#67797F]"
                        style={{ color: appearance?.colors?.textSecondary }}
                    >
                        Sign in using one of the options below
                    </p>
                </div>
            ) : null}

            <EmailAuthFlow />

            <Divider appearance={appearance} text="OR" />

            <GoogleSignIn />

            <FarcasterProvider baseUrl={baseUrl}>
                <FarcasterSignIn />
            </FarcasterProvider>

            <DiscordSignIn />

            {step === "initial" || step === "otp" ? (
                <PoweredByCrossmint className="justify-center" color={appearance?.colors?.textSecondary ?? "#A4AFB2"} />
            ) : null}
        </div>
    );
}

export const AuthFormBackButton = ({
    className,
    iconColor,
    ...props
}: React.HTMLAttributes<HTMLButtonElement> & { iconColor?: string }) => {
    return (
        <button
            className={classNames(
                "relative rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
                className
            )}
            {...props}
        >
            <LeftArrowIcon className="w-6 h-6" style={{ color: iconColor }} />
        </button>
    );
};
