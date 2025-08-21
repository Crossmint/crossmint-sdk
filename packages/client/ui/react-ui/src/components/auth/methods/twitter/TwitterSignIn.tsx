import type { ButtonHTMLAttributes } from "react";
import { TwitterIcon } from "@/icons/twitter";
import { useOAuthFlow } from "@/providers/auth/OAuthFlowProvider";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { OAuthButton } from "@/components/common/OAuthButton";

export function TwitterSignIn({ ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    const { step, appearance } = useAuthForm();
    const { startOAuthLogin, activeOAuthProvider } = useOAuthFlow();
    const isLoading = activeOAuthProvider === "twitter";

    if (step !== "initial") {
        return null;
    }

    return (
        <OAuthButton
            icon={<TwitterIcon style={{ height: "22px", width: "22px" }} />}
            isLoading={isLoading}
            appearance={appearance}
            onButtonClick={() => startOAuthLogin("twitter")}
            {...props}
        >
            Sign in with X
        </OAuthButton>
    );
}
