import type { UIConfig } from "@crossmint/common-sdk-base";
import type React from "react";
import { classNames } from "../../../../utils/classNames";
import { tw } from "@/twind-instance";

export function Web3ConnectorButton({
    title,
    appearance,
    img,
    ...props
}: {
    title: string;
    appearance?: UIConfig;
    img: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            className={classNames(
                "relative flex text-base p-4 bg-cm-muted-primary text-cm-text-primary items-center w-full rounded-xl justify-center",
                "transition-colors duration-200 ease-in-out",
                "hover:bg-cm-hover focus:bg-cm-hover outline-none"
            )}
            style={{
                borderRadius: appearance?.borderRadius,
                borderColor: appearance?.colors?.border,
                backgroundColor: appearance?.colors?.buttonBackground,
            }}
            {...props}
        >
            <>
                <img src={img} alt={title} className={tw("h-[25px] w-[25px] absolute left-[18px]")} />
                <span className={tw("font-medium")} style={{ color: appearance?.colors?.textPrimary }}>
                    {title}
                </span>
            </>
            <span className={tw("sr-only")}>Sign in with {title}</span>
        </button>
    );
}
