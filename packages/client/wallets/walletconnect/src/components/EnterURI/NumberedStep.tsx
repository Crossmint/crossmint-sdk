import { classNames } from "@/utils/classNames";

import { useCrossmintWalletConnect } from "../../hooks/useCrossmintWalletConnect";

export function NumberedStep({ stepNumber, text }: { stepNumber: number; text: string }) {
    const { uiConfig } = useCrossmintWalletConnect();

    const mobile = "w-[1.5rem] h-[1.5rem] w-8 h-8 mr-2";
    const desktop = "sm:w-12 sm:h-12 sm:mr-4 sm:w-[2rem] sm:h-[2rem] sm:mr-4";
    const className = classNames(mobile, desktop, "rounded-full flex items-center justify-center flex-none");

    return (
        <div className="flex items-center">
            <div
                className={className}
                style={{
                    border: `1px solid ${uiConfig.colors.accent}`,
                }}
            >
                <span
                    className="text-xs sm:text-base"
                    style={{
                        color: uiConfig.colors.accent,
                    }}
                >
                    {stepNumber}
                </span>
            </div>
            <p
                className="text-sm font-medium sm:text-base"
                style={{
                    color: uiConfig.colors.textPrimary,
                }}
            >
                {text}
            </p>
        </div>
    );
}
