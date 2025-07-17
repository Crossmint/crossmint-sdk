import type { UIConfig } from "@crossmint/common-sdk-base";
import { Spinner } from "@/components/common/Spinner";
import { useOAuthFlow } from "@/providers/auth/OAuthFlowProvider";
import { GoogleIcon } from "@/icons/google";
import { classNames } from "@/utils/classNames";

export function ContinueWithGoogle({ emailInput, appearance }: { emailInput: string; appearance?: UIConfig }) {
    const { startOAuthLogin, isLoading } = useOAuthFlow();

    return (
        <button
            type="button"
            className={classNames(
                "flex items-center gap-2 justify-center h-[32px] px-2.5 border border-cm-border rounded-xl bg-cm-background-primary",
                "hover:bg-cm-hover focus:bg-cm-hover outline-none",
                isLoading ? "cursor-not-allowed hover:bg-cm-muted-primary" : ""
            )}
            onClick={isLoading ? undefined : () => startOAuthLogin("google", emailInput.trim().toLowerCase())}
            style={{
                backgroundColor: appearance?.colors?.buttonBackground,
                borderRadius: appearance?.borderRadius,
            }}
        >
            <GoogleIcon className="max-h-[18px] max-w-[18px] h-[18px] w-[18px]" />
            {isLoading ? (
                <Spinner
                    style={{
                        color: appearance?.colors?.textSecondary,
                        fill: appearance?.colors?.textPrimary,
                        width: "18px",
                        height: "18px",
                    }}
                />
            ) : (
                <span className="text-cm-accent" style={{ color: appearance?.colors?.accent }}>
                    Continue
                </span>
            )}
        </button>
    );
}
