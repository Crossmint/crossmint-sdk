import { ExclamationIcon, QuestionMarkCircleIcon } from "@heroicons/react/outline";
import type React from "react";
import { type FocusEventHandler, type MouseEventHandler, useCallback, useEffect, useState } from "react";
import { FiAlertTriangle } from "react-icons/fi";

import { classNames } from "../../utils/uiUtils";
import { BodyText, Caption, Paragraph } from "./Text";
import { Tooltip, TooltipContent, TooltipPortal, TooltipProvider, TooltipTrigger } from "./Tooltip";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    description?: string;
    tooltip?: string | React.ReactNode;
    isOptional?: boolean;
    errorMessage?: string;
    caption?: string;
    captionClassName?: string;
    captionIconEnabled?: boolean;
    leftExtention?: string;
    rightExtention?: string;
    wrapperClassName?: string;
    inputContainerClassname?: string;
    labelClassName?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    onRightIconClick?: () => void;
    rightIconClassName?: string;
    maxCharacters?: number;
    maxInput?: number;
};

const InputV2 = ({
    label,
    role,
    description,
    tooltip,
    isOptional,
    errorMessage,
    caption,
    captionClassName,
    leftExtention,
    rightExtention,
    onFocus,
    onBlur,
    onMouseLeave,
    onMouseEnter,
    labelClassName,
    wrapperClassName,
    inputContainerClassname = "rounded-md",
    className,
    leftIcon,
    rightIcon,
    captionIconEnabled,
    onRightIconClick,
    rightIconClassName,
    maxCharacters,
    value,
    disabled,
    ...restInputProps
}: InputProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [hasExceededCharacters, setHasExceededCharacters] = useState(false);

    const handleFocus: FocusEventHandler<HTMLInputElement> = (e) => {
        setIsFocused(true);
        onFocus && onFocus(e);
    };

    const handleBlur: FocusEventHandler<HTMLInputElement> = (e) => {
        setIsFocused(false);
        onBlur && onBlur(e);
    };

    const handleMouseLeave: MouseEventHandler<HTMLInputElement> = (e) => {
        setIsHovered(false);
        onMouseLeave && onMouseLeave(e);
    };
    const handleMouseDown: MouseEventHandler<HTMLInputElement> = (e) => {
        setIsHovered(true);
        onMouseEnter && onMouseEnter(e);
    };

    const getTextLength = useCallback(() => {
        return typeof value === "string" ? value.length : 0;
    }, [value]);

    useEffect(() => {
        if (!maxCharacters) {
            return;
        }

        const textLength = getTextLength();
        setHasExceededCharacters(textLength > maxCharacters);
    }, [value, maxCharacters, getTextLength]);

    const hasHeader = label || description || tooltip || isOptional;

    const isClickableIcon = onRightIconClick != null;

    const iconClassname = classNames("py-2.5 px-4 h-full", rightIconClassName, isClickableIcon ? "cursor-pointer" : "");
    return (
        <div className={classNames("space-y-3", wrapperClassName)}>
            {hasHeader && (
                <div className="space-y-2">
                    <div className="flex items-center space-x-1">
                        {label && (
                            <Paragraph
                                className={classNames("!text-custom-text-primary font-semibold", labelClassName)}
                            >
                                {label}
                            </Paragraph>
                        )}
                        {isOptional && <Paragraph>(Optional)</Paragraph>}
                        {tooltip && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <QuestionMarkCircleIcon className="w-4 h-4 text-custom-text-secondary" />
                                    </TooltipTrigger>
                                    <TooltipPortal>
                                        <TooltipContent>
                                            <BodyText>{tooltip}</BodyText>
                                        </TooltipContent>
                                    </TooltipPortal>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    {description && <Paragraph>{description}</Paragraph>}
                </div>
            )}
            <div className="space-y-2">
                <div
                    className={classNames(
                        "flex h-10 border transition",
                        inputContainerClassname,
                        errorMessage ? "border-error-dark" : "border-custom-border",
                        isHovered && "!border-custom-text-secondary",
                        isFocused && "!border-link"
                    )}
                >
                    {leftExtention && (
                        <div className="bg-custom-background-light rounded-l-md border-r py-2.5 px-4 h-full">
                            <Paragraph>{leftExtention}</Paragraph>
                        </div>
                    )}
                    {leftIcon && <div className="h-full py-3 pl-4 pr-1">{leftIcon}</div>}
                    <input
                        className={classNames(
                            "py-2.5 px-3.5 text-sm h-full rounded-md focus-visible:outline-none w-full placeholder:text-[#67797F] truncate",
                            rightExtention && "rounded-r-none",
                            leftExtention && "rounded-l-none",
                            disabled && "text-[#67797F]",
                            className
                        )}
                        {...restInputProps}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onMouseLeave={handleMouseLeave}
                        onMouseEnter={handleMouseDown}
                        value={value}
                        role={role}
                        disabled={disabled}
                    />
                    {rightIcon && (
                        <div className={iconClassname} {...(isClickableIcon ? { onClick: onRightIconClick } : {})}>
                            {rightIcon}
                        </div>
                    )}

                    {rightExtention && (
                        <div className="bg-custom-background-light rounded-r-md border-l py-2.5 px-4 h-full">
                            <Paragraph>{rightExtention}</Paragraph>
                        </div>
                    )}
                </div>
                {caption && captionIconEnabled && (
                    <div className="flex items-center space-x-1">
                        <FiAlertTriangle className="text-secondary-text w-[15px]" />
                        {caption && (
                            <Paragraph className={classNames("text-xs", captionClassName)}>{caption}</Paragraph>
                        )}
                    </div>
                )}
                {caption && !captionIconEnabled && (
                    <Paragraph className={classNames("text-xs", captionClassName)}>{caption}</Paragraph>
                )}
            </div>
            {maxCharacters && (
                <Caption className={classNames(hasExceededCharacters ? "text-error-dark" : "")}>
                    {getTextLength()}/{maxCharacters} character limit
                </Caption>
            )}
            {errorMessage && (
                <div className="flex space-x-1.5">
                    <ExclamationIcon className="text-error-dark w-[18px] h-[18px]" />
                    <Paragraph className="text-xs text-error-dark">{errorMessage}</Paragraph>
                </div>
            )}
        </div>
    );
};

export default InputV2;
