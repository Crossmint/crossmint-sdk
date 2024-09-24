"use client";

import type { HTMLAttributeAnchorTarget, MouseEvent, ReactNode } from "react";
import type { ButtonProps } from "react-html-props";

import { isEmpty } from "../../utils/stringUtils";
import { type CrossmintElementProps, classNames } from "../../utils/uiUtils";

export type ButtonType = "primary" | "secondary" | "tertiary" | "text" | "danger" | "custom";

type Props = Omit<CrossmintElementProps<ButtonProps>, "type"> & {
    id?: string;
    children?: ReactNode;
    onClick?: (e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) => void;
    href?: string;
    target?: HTMLAttributeAnchorTarget;
    disabled?: boolean;
    tiny?: boolean;
    loading?: boolean;
    icon?: ReactNode;
    tooltipMessage?: string;
    btnType?: "button" | "submit" | "reset";
    role?: string;
    type?: ButtonType;
};

const Spinner = ({ type }: { type: ButtonType }) => {
    const solidBGTypes = ["primary"];
    const color = solidBGTypes.includes(type) ? "text-custom-background" : "text-custom-text-primary";
    const classes = classNames("w-5 h-5 -ml-1 animate-spin", color);

    return (
        <svg className={classes} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    );
};

export default function Button({
    id,
    children,
    onClick,
    style,
    disabled,
    type = "primary",
    className,
    tiny = false,
    loading = false,
    icon,
    tooltipMessage = "",
    btnType = "button",
    role = "button",
    ...btnProps
}: Props) {
    const isPrimary = type === "primary";
    const isSecondary = type === "secondary";
    const isTertiary = type === "tertiary";
    const isText = type === "text";
    const isDanger = type === "danger";
    const isCustom = type === "custom";

    const commonClasses =
        "text-center rounded-md disabled:opacity-25 disabled:transition-none disabled:cursor-not-allowed transition group";

    const primaryTextColor = "text-white";
    const primaryClasses = classNames("bg-custom-primary enabled:hover:bg-custom-primary-hover", primaryTextColor);

    const secondaryTextColor = "text-custom-text-primary";
    const secondaryClasses = classNames(
        "border border-custom-text-primary enabled:hover:bg-custom-text-primary enabled:hover:text-custom-background",
        secondaryTextColor
    );

    const tertiaryTextColor = "text-custom-text-secondary";
    const tertiaryClasses = classNames(
        "bg-transparent border border-custom-text-secondary enabled:hover:bg-custom-tertiary-hover enabled:hover:text-custom-text-primary",
        tertiaryTextColor
    );

    const textButtonTextColor = "text-link";
    const textClasses = classNames("bg-transparent enabled:hover:text-[#72AEFD]", textButtonTextColor);

    const dangerTextColor = "text-error-dark";
    const dangerClasses = classNames("border border-error-dark enabled:hover:bg-error-light", dangerTextColor);

    const normalSizeClasses = "p-3";
    const tinyClasses = "py-2 px-4 text-sm";

    const withIcon = "pl-5 pr-10";
    const withoutIcon = "px-7";

    const getTypeClasses = () => {
        if (isPrimary) {
            return primaryClasses;
        }
        if (isSecondary) {
            return secondaryClasses;
        }
        if (isTertiary) {
            return tertiaryClasses;
        }
        if (isText) {
            return textClasses;
        }
        if (isDanger) {
            return dangerClasses;
        }
        return "";
    };

    let classes = isCustom ? className : "";

    if (isEmpty(classes)) {
        classes = classNames(
            commonClasses,
            getTypeClasses(),
            tiny ? tinyClasses : normalSizeClasses,
            className || "",
            loading ? "pointer-events-none button-loading" : "button-loaded",
            icon || tooltipMessage ? withIcon : withoutIcon
        );
    }

    const button = (
        <button
            type={btnType}
            role={role}
            id={id}
            disabled={disabled}
            className={classes}
            onClick={(e) => (onClick ? onClick(e) : null)}
            style={style}
            {...btnProps}
        >
            <div className="relative flex items-center justify-center">
                {loading && (
                    <div
                        role="loader"
                        className="absolute  transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2"
                    >
                        <Spinner type={type} />
                    </div>
                )}
                {icon && <div className="w-4 mr-2">{icon}</div>}
                <span className={classNames("flex items-center font-medium", loading ? "opacity-0" : "")}>
                    {children}
                </span>
            </div>
        </button>
    );

    return button;
}
