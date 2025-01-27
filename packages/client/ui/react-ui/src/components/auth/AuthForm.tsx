import { lazy } from "react";
import Color from "color";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { EmailAuthFlow } from "./methods/email/EmailAuthFlow";
import { Divider } from "../common/Divider";
import { GoogleSignIn } from "./methods/google/GoogleSignIn";
import { FarcasterSignIn } from "./methods/farcaster/FarcasterSignIn";
import { SecuredByCrossmint } from "../common/SecuredByCrossmint";
import { FarcasterProvider } from "../../providers/auth/FarcasterProvider";
import { classNames } from "@/utils/classNames";
import { AlertIcon } from "@/icons/alert";
import { TwitterSignIn } from "./methods/twitter/TwitterSignIn";

const Web3AuthFlow = lazy(() =>
    // @ts-expect-error - Error because we dont use 'module' field in tsconfig, which is expected because we use tsup to compile
    import("./methods/web3/Web3AuthFlow").then((mod) => ({
        default: mod.Web3AuthFlow,
    }))
);

export function AuthForm({ className }: { className?: string }) {
    const { step, appearance, loginMethods, baseUrl, error } = useAuthForm();

    return (
        <div
            className={classNames(
                "relative p-6 pb-4 !min-[480px]:p-10 !min-[480px]:pb-8 flex flex-col gap-[10px] antialiased animate-none",
                className
            )}
        >
            {error != null ? (
                <div
                    className="flex items-start justify-start w-full rounded-lg p-2 mt-4 bg-cm-danger-muted"
                    style={{
                        backgroundColor: new Color(appearance?.colors?.danger ?? "#f44336").alpha(0.12).toString(),
                    }}
                >
                    <div className="min-w-[20px]">
                        <AlertIcon customColor={appearance?.colors?.danger ?? "#f44336"} />
                    </div>
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
            {loginMethods.includes("twitter") ? <TwitterSignIn /> : null}
            {loginMethods.includes("web3") ? <Web3AuthFlow /> : null}

            {step === "initial" || step === "otp" ? (
                <SecuredByCrossmint
                    className="mt-4 justify-center"
                    color={appearance?.colors?.textSecondary ?? "#A4AFB2"}
                />
            ) : null}
        </div>
    );
}
