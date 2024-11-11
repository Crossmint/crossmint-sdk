import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { EmailAuthFlow } from "./methods/email/EmailAuthFlow";
import { Divider } from "../common/Divider";
import { GoogleSignIn } from "./methods/google/GoogleSignIn";
import { FarcasterSignIn } from "./methods/farcaster/FarcasterSignIn";
import { PoweredByCrossmint } from "../common/PoweredByCrossmint";
import { FarcasterProvider } from "../../providers/auth/FarcasterProvider";
import { classNames } from "@/utils/classNames";
import { Web3AuthFlow } from "./methods/web3/Web3AuthFlow";
import Color from "color";
import { AlertIcon } from "@/icons/alert";

export function AuthForm({ className }: { className?: string }) {
    const { step, appearance, loginMethods, baseUrl, error } = useAuthForm();

    return (
        <div className={classNames("flex flex-col gap-[10px] antialiased animate-none", className)}>
            {error ? (
                <div
                    className="flex items-start justify-start w-full rounded-lg p-2 mt-4 bg-cm-danger-muted"
                    style={{
                        backgroundColor: new Color(appearance?.colors?.danger ?? "#f44336").alpha(0.12).toString(),
                    }}
                >
                    <AlertIcon customColor={appearance?.colors?.danger ?? "#f44336"} />
                    <p className="ml-2 text-sm" style={{ color: appearance?.colors?.danger ?? "#f44336" }}>
                        {error}
                    </p>
                </div>
            ) : null}

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
            {loginMethods.includes("web3") ? <Web3AuthFlow /> : null}

            {step === "initial" || step === "otp" ? (
                <PoweredByCrossmint
                    className="mt-4 justify-center"
                    color={appearance?.colors?.textSecondary ?? "#A4AFB2"}
                />
            ) : null}
        </div>
    );
}
