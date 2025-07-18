import type { UIConfig } from "@crossmint/common-sdk-base";
import { Spinner } from "@/components/common/Spinner";
import { useOAuthWindowListener } from "@/hooks/useOAuthWindowListener";
import { GoogleIcon } from "@/icons/google";
import { classNames } from "@/utils/classNames";
import { tw } from "@/twind-instance";

export function ContinueWithGoogle({ emailInput, appearance }: { emailInput: string; appearance?: UIConfig }) {
    const { createPopupAndSetupListeners, isLoading: isLoadingOAuthWindow } = useOAuthWindowListener("google");

    return (
        <button
            type="button"
            className={classNames(
                "flex items-center gap-2 justify-center h-[32px] px-2.5 border border-cm-border rounded-xl bg-cm-background-primary",
                "hover:bg-cm-hover focus:bg-cm-hover outline-none",
                isLoadingOAuthWindow ? "cursor-not-allowed hover:bg-cm-muted-primary" : ""
            )}
            onClick={
                isLoadingOAuthWindow ? undefined : () => createPopupAndSetupListeners(emailInput.trim().toLowerCase())
            }
            style={{
                backgroundColor: appearance?.colors?.buttonBackground,
                borderRadius: appearance?.borderRadius,
            }}
        >
            <GoogleIcon className={tw("max-h-[18px] max-w-[18px] h-[18px] w-[18px]")} />
            {isLoadingOAuthWindow ? (
                <Spinner
                    style={{
                        color: appearance?.colors?.textSecondary,
                        fill: appearance?.colors?.textPrimary,
                        width: "18px",
                        height: "18px",
                    }}
                />
            ) : (
                <span className={tw("text-cm-accent")} style={{ color: appearance?.colors?.accent }}>
                    Continue
                </span>
            )}
        </button>
    );
}
