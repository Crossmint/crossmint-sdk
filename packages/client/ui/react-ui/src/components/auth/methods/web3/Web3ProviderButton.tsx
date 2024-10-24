import type { UIConfig } from "@crossmint/common-sdk-base";
import type React from "react";
import { classNames } from "../../../../utils/classNames";
import { Spinner } from "@/components/common/Spinner";

export function Web3ProviderButton({
    title,
    isLoading,
    appearance,
    img,
    ...props
}: {
    title: string;
    isLoading: boolean;
    appearance?: UIConfig;
    img: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            className={classNames(
                "relative flex text-base p-4 bg-cm-muted-primary text-cm-text-primary border border-cm-border items-center w-full rounded-xl justify-center",
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
            {...props}
        >
            <>
                <img src={img} alt={title} className="h-[25px] w-[25px] absolute left-[18px]" />
                {isLoading ? (
                    <Spinner
                        style={{
                            color: appearance?.colors?.textSecondary,
                            fill: appearance?.colors?.textPrimary,
                        }}
                    />
                ) : (
                    <span className="font-medium" style={{ color: appearance?.colors?.textPrimary }}>
                        {title}
                    </span>
                )}
            </>

            {/* For accessibility sake   */}
            <span className="sr-only">Sign in with {title}</span>
        </button>
    );
}
