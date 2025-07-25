import type { ButtonHTMLAttributes } from "react";
import { GoogleIcon } from "@/icons/google";
import { useOAuthFlow } from "@/providers/auth/OAuthFlowProvider";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { OAuthButton } from "@/components/common/OAuthButton";

export function GoogleSignIn({ ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    const { step, appearance } = useAuthForm();
    const { startOAuthLogin, activeOAuthProvider } = useOAuthFlow();
    const isLoading = activeOAuthProvider === "google";

    if (step !== "initial") {
        return null;
    }

    return (
        <OAuthButton
            icon={<GoogleIcon style={{ height: "25px", width: "25px" }} />}
            isLoading={isLoading}
            appearance={appearance}
            onButtonClick={() => startOAuthLogin("google")}
            {...props}
        >
            <span style={{ color: appearance?.colors?.textPrimary }}>Sign in with Google</span>
        </OAuthButton>
    );
}
