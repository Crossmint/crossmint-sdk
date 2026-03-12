import type React from "react";
import { lazy, Suspense } from "react";
import Color from "color";
import styled from "@emotion/styled";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { EmailAuthFlow } from "./methods/email/EmailAuthFlow";
import { Divider } from "../common/Divider";
import { GoogleSignIn } from "./methods/google/GoogleSignIn";
import { SecuredByCrossmint } from "../common/SecuredByCrossmint";
import { AlertIcon } from "@/icons/alert";
import { TwitterSignIn } from "./methods/twitter/TwitterSignIn";
import { Web3AuthFlow } from "./methods/web3/Web3AuthFlow";
import { theme } from "../../styles";
import { DialogDescription, DialogTitle } from "../common/Dialog";

const LazyFarcasterSection = lazy(() =>
    Promise.all([
        // @ts-expect-error - Error because we dont use 'module' field in tsconfig, which is expected because we use tsup to compile
        import("../../providers/auth/FarcasterProvider"),
        // @ts-expect-error - Error because we dont use 'module' field in tsconfig, which is expected because we use tsup to compile
        import("./methods/farcaster/FarcasterSignIn"),
    ]).then(([providerMod, signInMod]) => ({
        default: ({ baseUrl }: { baseUrl: string }) => (
            <providerMod.FarcasterProvider baseUrl={baseUrl}>
                <signInMod.FarcasterSignIn />
            </providerMod.FarcasterProvider>
        ),
    }))
);

const AuthFormContainer = styled.div`
    position: relative;
    padding: 40px 24px 30px 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    -webkit-font-smoothing: antialiased;
    animation: none;
    
    @media (min-width: 480px) {
        padding: 40px 40px 30px 40px;
    }
`;

const ErrorContainer = styled.div<{ appearance?: UIConfig }>`
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    border-radius: 8px;
    padding: 8px;
    gap: 8px;
    margin-top: 34px;
    background-color: ${(props) => new Color(props.appearance?.colors?.danger ?? theme["cm-danger"]).alpha(0.12).toString()};
`;

export function AuthForm({ style }: { style?: React.CSSProperties }) {
    const { step, appearance, loginMethods, baseUrl, error, termsOfServiceText, authModalTitle } = useAuthForm();

    return (
        <AuthFormContainer style={style}>
            {error != null ? (
                <ErrorContainer appearance={appearance}>
                    <div style={{ minWidth: "20px" }}>
                        <AlertIcon customColor={appearance?.colors?.danger ?? theme["cm-danger"]} />
                    </div>
                    <p style={{ fontSize: "14px", margin: 0, color: appearance?.colors?.danger ?? theme["cm-danger"] }}>
                        {error}
                    </p>
                </ErrorContainer>
            ) : null}

            {step === "initial" ? (
                <div>
                    <DialogTitle appearance={appearance}>{authModalTitle ?? "Sign in to Crossmint"}</DialogTitle>
                    <DialogDescription appearance={appearance}>
                        Access using one of the options below.
                    </DialogDescription>
                </div>
            ) : null}

            {loginMethods.includes("google") ? <GoogleSignIn /> : null}
            {loginMethods.includes("farcaster") ? (
                <Suspense fallback={null}>
                    {/* @deprecated Farcaster login is deprecated and will be removed in a future release. */}
                    <LazyFarcasterSection baseUrl={baseUrl} />
                </Suspense>
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
                    style={{
                        fontSize: "0.875rem",
                        textAlign: "center",
                        marginTop: "0.5rem",
                        color: appearance?.colors?.textSecondary ?? theme["cm-text-secondary"],
                    }}
                >
                    <style>{`
                        p a {
                            color: ${appearance?.colors?.textLink ?? theme["cm-link"]};
                        }
                    `}</style>
                    {termsOfServiceText}
                </div>
            ) : null}

            {step === "initial" || step === "otp" ? (
                <SecuredByCrossmint
                    style={{ marginTop: "1rem", justifyContent: "center" }}
                    color={appearance?.colors?.textSecondary ?? theme["cm-text-secondary"]}
                />
            ) : null}
        </AuthFormContainer>
    );
}
