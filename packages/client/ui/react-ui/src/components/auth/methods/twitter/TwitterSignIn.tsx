import type { ButtonHTMLAttributes } from "react";
import { TwitterIcon } from "@/icons/twitter";
import { useOAuthWindowListener } from "@/hooks/useOAuthWindowListener";
import { Spinner } from "@/components/common/Spinner";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { classNames } from "@/utils/classNames";

export function TwitterSignIn({ ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    const { step, appearance, isLoadingOauthUrlMap } = useAuthForm();
    const { createPopupAndSetupListeners, isLoading: isLoadingOAuthWindow } = useOAuthWindowListener("twitter");
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
            onClick={isLoading ? undefined : createPopupAndSetupListeners}
            {...props}
        >
            <>
                <TwitterIcon className="h-[25px] w-[25px] absolute left-[18px]" />

                {isLoading ? (
                    <Spinner
                        style={{
                            color: appearance?.colors?.textSecondary,
                            fill: appearance?.colors?.textPrimary,
                        }}
                    />
                ) : (
                    <span
                        className="font-medium"
                        style={{ margin: "0px 32px", color: appearance?.colors?.textPrimary }}
                    >
                        Sign in with X
                    </span>
                )}
            </>
            <span className="sr-only">Sign in with X</span>
        </button>
    );
}
