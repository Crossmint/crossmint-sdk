"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { createContext, useContext } from "react";
import { classNames } from "@/utils/classNames";
import { tw } from "@/twind-instance";

// Define the type for customStyles
type CustomStyles = {
    textPrimary: string;
    inputBackground: string;
    buttonBackground: string;
    accent: string;
    danger: string;
    border: string;
    borderRadius?: string;
};

// Create a context for customStyles
const CustomStylesContext = createContext<CustomStyles | undefined>(undefined);

type InputOTPProps = React.ComponentPropsWithoutRef<typeof OTPInput> & {
    customStyles?: CustomStyles;
};
type InputOTPRef = React.ElementRef<typeof OTPInput>;

const InputOTP: React.ForwardRefExoticComponent<InputOTPProps & React.RefAttributes<InputOTPRef>> = React.forwardRef<
    InputOTPRef,
    InputOTPProps
>(({ className, containerClassName, customStyles, ...props }, ref) => (
    <CustomStylesContext.Provider value={customStyles}>
        <OTPInput
            autoFocus
            ref={ref}
            containerClassName={classNames("flex items-center gap-2 has-[:disabled]:opacity-50", containerClassName)}
            className={classNames("disabled:cursor-not-allowed", className)}
            {...props}
        />
    </CustomStylesContext.Provider>
));
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={classNames("flex gap-2 items-center", className)} {...props} />
    )
);
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = React.forwardRef<
    React.ElementRef<"div">,
    React.ComponentPropsWithoutRef<"div"> & {
        index: number;
        hasError?: boolean;
    }
>(({ index, className, hasError, ...props }, ref) => {
    const inputOTPContext = React.useContext(OTPInputContext);
    const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index];
    const customStyles = useContext(CustomStylesContext);

    return (
        <div
            ref={ref}
            className={classNames(
                "relative flex h-14 w-12 items-center bg-cm-muted-primary justify-center border border-cm-border text-lg transition-all rounded-md text-cm-text-primary",
                isActive && `z-10 ring-2 ring-offset-background`,
                className
            )}
            style={{
                borderRadius: customStyles?.borderRadius,
                borderColor: hasError ? customStyles?.danger : customStyles?.border,
                boxShadow: isActive ? `0 0 0 2px ${customStyles?.accent}` : "none",
                backgroundColor: char ? customStyles?.buttonBackground : customStyles?.inputBackground,
            }}
            {...props}
        >
            {char}
            {hasFakeCaret && (
                <div className={tw("pointer-events-none absolute inset-0 flex items-center justify-center")}>
                    <div
                        className={tw("h-4 w-px animate-caret-blink duration-1000")}
                        style={{
                            height: "18px",
                            backgroundColor: customStyles?.textPrimary,
                        }}
                    />
                </div>
            )}
        </div>
    );
});
InputOTPSlot.displayName = "InputOTPSlot";

export { InputOTP, InputOTPGroup, InputOTPSlot };
