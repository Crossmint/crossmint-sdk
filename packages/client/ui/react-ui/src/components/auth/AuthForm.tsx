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
import { Web3AuthFlow } from "./methods/web3/Web3AuthFlow";
import { tw } from "@/twind-instance";

export function AuthForm({ className }: { className?: string }) {
    const { step, appearance, loginMethods, baseUrl, error, termsOfServiceText, authModalTitle } = useAuthForm();

    return (
        <div
            className={classNames(
                "relative pt-10 pb-[30px] px-6 !min-[480px]:px-10 flex flex-col gap-[10px] antialiased animate-none",
                className
            )}
        >
            {error != null ? (
                <div
                    className={tw("flex items-start justify-start w-full rounded-lg p-2 mt-4 bg-cm-danger-muted")}
                    style={{
                        backgroundColor: new Color(appearance?.colors?.danger ?? "#f44336").alpha(0.12).toString(),
                    }}
                >
                    <div className={tw("min-w-[20px]")}>
                        <AlertIcon customColor={appearance?.colors?.danger ?? "#f44336"} />
                    </div>
                    <p className={tw("ml-2 text-sm")} style={{ color: appearance?.colors?.danger ?? "#f44336" }}>
                        {error}
                    </p>
                </div>
            ) : null}

            {step === "initial" ? (
                <div>
                    <h1
                        className={tw("text-2xl font-bold text-cm-text-primary")}
                        style={{ color: appearance?.colors?.textPrimary }}
                    >
                        {authModalTitle ?? "Sign in to Crossmint"}
                    </h1>
                    <p
                        className={tw("text-base font-normal mb-3 text-cm-text-secondary")}
                        style={{ color: appearance?.colors?.textSecondary }}
                    >
                        Access using one of the options below.
                    </p>
                </div>
            ) : null}

            {loginMethods.includes("google") ? <GoogleSignIn /> : null}
            {loginMethods.includes("farcaster") ? (
                <FarcasterProvider baseUrl={baseUrl}>
                    <FarcasterSignIn />
                </FarcasterProvider>
            ) : null}
            {loginMethods.includes("twitter") ? <TwitterSignIn /> : null}
            {loginMethods.some((method) => method.startsWith("web3")) ? <Web3AuthFlow /> : null}

            {loginMethods.includes("email") ? (
                <div>
                    {loginMethods.length > 1 ? <Divider appearance={appearance} text="OR" /> : null}
                    <EmailAuthFlow />
                </div>
            ) : null}

            {step === "initial" && termsOfServiceText != null ? (
                <div
                    className={tw("text-sm text-center text-cm-text-secondary mt-2")}
                    style={{ color: appearance?.colors?.textSecondary }}
                >
                    <style>{`
                        p a {
                            color: ${appearance?.colors?.textLink ?? "#1A74E9"};
                        }
                    `}</style>
                    {termsOfServiceText}
                </div>
            ) : null}

            {step === "initial" || step === "otp" ? (
                <SecuredByCrossmint
                    className={tw("mt-1.5 md:mt-4 justify-center")}
                    color={appearance?.colors?.textSecondary ?? "#67797F"}
                />
            ) : null}
        </div>
    );
}
