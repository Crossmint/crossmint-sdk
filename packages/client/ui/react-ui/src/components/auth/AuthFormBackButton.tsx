import type React from "react";
import { classNames } from "../../utils/classNames";
import { LeftArrowIcon } from "@/icons/leftArrow";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { tw } from "@/twind-instance";

export const AuthFormBackButton = ({
    className,
    iconColor,
    ringColor,
    onClick,
    ...props
}: React.HTMLAttributes<HTMLButtonElement> & { iconColor?: string; ringColor?: string }) => {
    const { setError } = useAuthForm();

    return (
        <button
            className={classNames(
                "absolute left-4 top-4 min-[480px]:!left-6 min-[480px]:!top-6 rounded-full opacity-70 ring-offset-background text-cm-text-primary transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-cm-accent focus:ring-offset-2 disabled:pointer-events-none",
                className
            )}
            onClick={(event) => {
                setError(null);
                onClick?.(event);
            }}
            {...props}
        >
            penis
            <LeftArrowIcon className={tw("w-6 h-6")} style={{ color: iconColor }} />
        </button>
    );
};
