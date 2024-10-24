import type React from "react";
import { classNames } from "../../utils/classNames";
import { LeftArrowIcon } from "@/icons/leftArrow";

export const AuthFormBackButton = ({
    className,
    iconColor,
    ringColor,
    ...props
}: React.HTMLAttributes<HTMLButtonElement> & { iconColor?: string; ringColor?: string }) => {
    return (
        <button
            className={classNames(
                "absolute rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-cm-ring focus:ring-offset-2 disabled:pointer-events-none",
                className
            )}
            style={{
                // @ts-expect-error --tw-ring-color is not recognized by typescript but gets picked up by tailwind
                "--tw-ring-color": ringColor ?? "#1A73E8",
            }}
            {...props}
        >
            <LeftArrowIcon className="w-6 h-6" style={{ color: iconColor }} />
        </button>
    );
};
