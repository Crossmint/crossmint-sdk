import type { ButtonHTMLAttributes } from "react";
import { GoogleIcon } from "@/icons/google";
import { useOAuthWindowListener } from "@/hooks/useOAuthWindowListener";
import { Spinner } from "@/components/common/Spinner";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { classNames } from "@/utils/classNames";
import { tw } from "@/twind-instance";

export function GoogleSignIn({ ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    const { step, appearance, isLoadingOauthUrlMap } = useAuthForm();
    const { createPopupAndSetupListeners, isLoading: isLoadingOAuthWindow } = useOAuthWindowListener("google");
    const isLoading = isLoadingOauthUrlMap || isLoadingOAuthWindow;

    if (step !== "initial") {
        return null;
    }

    return (
        <button
            className={classNames(
                "relative flex text-base p-4 bg-cm-muted-primary text-cm-text-primary items-center w-full rounded-xl justify-center",
                "transition-colors duration-200 ease-in-out",
                "hover:bg-cm-hover focus:bg-cm-hover outline-none",
                isLoading ? "cursor-not-allowed hover:bg-cm-muted-primary" : ""
            )}
            style={{
                borderRadius: appearance?.borderRadius,
                backgroundColor: appearance?.colors?.buttonBackground,
            }}
            onClick={isLoading ? undefined : () => createPopupAndSetupListeners()}
            {...props}
        >
            <>
                <GoogleIcon className={tw("max-h-[25px] max-w-[25px] h-[25px] w-[25px] absolute left-[18px]")} />
                {isLoading ? (
                    <Spinner
                        style={{
                            color: appearance?.colors?.textSecondary,
                            fill: appearance?.colors?.textPrimary,
                        }}
                    />
                ) : (
                    <span
                        className={tw("font-medium")}
                        style={{ margin: "0px 32px", color: appearance?.colors?.textPrimary }}
                    >
                        Sign in with Google
                    </span>
                )}
            </>
            <span className={tw("sr-only")}>Sign in with Google</span>
        </button>
    );
}
