"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { createContext, useContext } from "react";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { theme } from "@/styles";

const CustomStylesContext = createContext<UIConfig | undefined>(undefined);

type InputOTPProps = React.ComponentPropsWithoutRef<typeof OTPInput> & {
    appearance?: UIConfig;
};
type InputOTPRef = React.ElementRef<typeof OTPInput>;

const OTPContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    
    &:has(:disabled) {
        opacity: 0.5;
    }
`;

const OTPInputStyled = styled(OTPInput)`
    &:disabled {
        cursor: not-allowed;
    }
`;

const InputOTP: React.ForwardRefExoticComponent<InputOTPProps & React.RefAttributes<InputOTPRef>> = React.forwardRef<
    InputOTPRef,
    InputOTPProps
>(({ appearance, ...props }, ref) => (
    <CustomStylesContext.Provider value={appearance}>
        <OTPContainer>
            <OTPInputStyled autoFocus ref={ref} {...props} />
        </OTPContainer>
    </CustomStylesContext.Provider>
));
InputOTP.displayName = "InputOTP";

const GroupContainer = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

const InputOTPGroup = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(
    ({ ...props }, ref) => <GroupContainer ref={ref} {...props} />
);
InputOTPGroup.displayName = "InputOTPGroup";

const caretBlink = keyframes`
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
`;

const SlotContainer = styled.div<{
    appearance?: UIConfig;
    hasError?: boolean;
    isActive?: boolean;
    hasChar?: boolean;
}>`
    position: relative;
    display: flex;
    height: 56px;
    width: 48px;
    align-items: center;
    justify-content: center;
    border: 1px solid;
    font-size: 18px;
    transition: all 200ms ease;
    border-radius: ${(props) => props.appearance?.borderRadius || "6px"};
    border-color: ${(props) =>
        props.hasError
            ? props.appearance?.colors?.danger || theme["cm-danger"]
            : props.appearance?.colors?.border || theme["cm-border"]};
    background-color: ${(props) =>
        props.hasChar
            ? props.appearance?.colors?.buttonBackground || theme["cm-muted-primary"]
            : props.appearance?.colors?.inputBackground || theme["cm-background-primary"]};
    color: ${(props) => props.appearance?.colors?.textPrimary || theme["cm-text-primary"]};
    box-shadow: ${(props) => (props.isActive ? `0 0 0 2px ${props.appearance?.colors?.accent || theme["cm-accent"]}` : "none")};
    z-index: ${(props) => (props.isActive ? 10 : 1)};
`;

const CaretContainer = styled.div`
    pointer-events: none;
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const Caret = styled.div<{ appearance?: UIConfig }>`
    height: 18px;
    width: 1px;
    background-color: ${(props) => props.appearance?.colors?.textPrimary || theme["cm-text-primary"]};
    animation: ${caretBlink} 1000ms infinite;
`;

const InputOTPSlot = React.forwardRef<
    React.ElementRef<"div">,
    React.ComponentPropsWithoutRef<"div"> & {
        index: number;
        hasError?: boolean;
    }
>(({ index, hasError, ...props }, ref) => {
    const inputOTPContext = React.useContext(OTPInputContext);
    const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index];
    const appearance = useContext(CustomStylesContext);

    return (
        <SlotContainer
            ref={ref}
            appearance={appearance}
            hasError={hasError}
            isActive={isActive}
            hasChar={!!char}
            {...props}
        >
            {char}
            {hasFakeCaret && (
                <CaretContainer>
                    <Caret appearance={appearance} />
                </CaretContainer>
            )}
        </SlotContainer>
    );
});
InputOTPSlot.displayName = "InputOTPSlot";

export { InputOTP, InputOTPGroup, InputOTPSlot };
