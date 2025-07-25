import type React from "react";
import styled from "@emotion/styled";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { LeftArrowIcon } from "@/icons/leftArrow";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { theme, globalReset } from "@/styles";

const BackButtonStyled = styled.button<{
    appearance?: UIConfig;
}>`
    ${globalReset}
    
    position: absolute;
    top: 0px;
    left: 0px;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: none;
    z-index: 1000;
    background-color: transparent;
    color: ${(props) => props.appearance?.colors?.textPrimary ?? theme["cm-text-secondary"]};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    
    &:hover {
        background-color: ${(props) => props?.appearance?.colors?.backgroundSecondary || theme["cm-hover"]};
        color: ${(props) => props.appearance?.colors?.textPrimary ?? theme["cm-text-secondary"]};
    }
    
    &:focus {
        outline: none;
        background-color: ${(props) => props?.appearance?.colors?.backgroundSecondary || theme["cm-hover"]};
        box-shadow: 0 0 0 2px ${(props) => props.appearance?.colors?.accent || theme["cm-accent"]};
    }
    
    svg {
        width: 24px;
        height: 24px;
    }
`;

export const AuthFormBackButton = ({
    iconColor,
    ringColor,
    onClick,
    ...props
}: React.HTMLAttributes<HTMLButtonElement> & { iconColor?: string; ringColor?: string; appearance?: UIConfig }) => {
    const { setError, appearance } = useAuthForm();

    return (
        <BackButtonStyled
            appearance={appearance}
            onClick={(event) => {
                setError(null);
                onClick?.(event);
            }}
            {...props}
        >
            <LeftArrowIcon style={{ height: "24px", width: "24px", color: iconColor }} />
        </BackButtonStyled>
    );
};
