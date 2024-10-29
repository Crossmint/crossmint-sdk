import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { EmailAuthFlow } from "./methods/email/EmailAuthFlow";
import { Divider } from "../common/Divider";
import { GoogleSignIn } from "./methods/google/GoogleSignIn";
import { FarcasterSignIn } from "./methods/farcaster/FarcasterSignIn";
import { PoweredByCrossmint } from "../common/PoweredByCrossmint";
import { FarcasterProvider } from "../../providers/auth/FarcasterProvider";
import { classNames } from "@/utils/classNames";

export function AuthForm({ className }: { className?: string }) {
    const { step, appearance, baseUrl, loginMethods } = useAuthForm();
    return (
        <div className={classNames("flex flex-col gap-[10px] antialiased animate-none", className)}>
            {step === "initial" ? (
                <div>
                    <h1
                        className="text-2xl font-bold text-cm-text-primary"
                        style={{ color: appearance?.colors?.textPrimary }}
                    >
                        Sign In
                    </h1>
                    <p
                        className="text-base font-normal mb-3 text-cm-text-secondary"
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

            {step === "initial" || step === "otp" ? (
                <PoweredByCrossmint
                    className="mt-5 justify-center"
                    color={appearance?.colors?.textSecondary ?? "#A4AFB2"}
                />
            ) : null}
        </div>
    );
}
