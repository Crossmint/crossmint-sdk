import type { ButtonHTMLAttributes } from "react";
import { GoogleIcon } from "@/icons/google";
import { useOAuthWindowListener } from "@/hooks/useOAuthWindowListener";
import { Spinner } from "@/components/common/Spinner";
import { useAuthDialog } from "@/providers/auth/AuthDialogProvider";
import { classNames } from "@/utils/classNames";

export function GoogleSignIn({ ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    const { step, apiKey, baseUrl, appearance, fetchAuthMaterial } = useAuthDialog();
    const { createPopupAndSetupListeners, isLoading } = useOAuthWindowListener("google", {
        apiKey,
        baseUrl,
        fetchAuthMaterial,
    });

    if (step !== "initial") {
        return null;
    }

    return (
        <button
            className={classNames(
                "relative flex text-base p-4 bg-[#F0F2F4] text-[#00150D] border items-center w-full rounded-xl justify-center",
                "transition-all duration-200 ease-in-out", // Add smooth transition
                "focus:outline-none focus:ring-1 focus:ring-opacity-50", // Add focus ring
                isLoading ? "cursor-not-allowed" : ""
            )}
            style={{
                borderRadius: appearance?.borderRadius,
                borderColor: appearance?.colors?.border,
                backgroundColor: appearance?.colors?.buttonBackground,
                // @ts-expect-error --tw-ring-color is not recognized by typescript but gets picked up by tailwind
                "--tw-ring-color": appearance?.colors?.accent ?? "#1A73E8",
            }}
            onClick={isLoading ? undefined : createPopupAndSetupListeners}
            {...props}
        >
            <>
                <GoogleIcon className="h-[25px] w-[25px] absolute left-[18px]" />
                {isLoading ? (
                    <Spinner />
                ) : (
                    <span
                        className="font-medium"
                        style={{ margin: "0px 32px", color: appearance?.colors?.textPrimary }}
                    >
                        Google
                    </span>
                )}
            </>

            {/* For accessibility sake   */}
            <span className="sr-only">Sign in with Google</span>
        </button>
    );
}
