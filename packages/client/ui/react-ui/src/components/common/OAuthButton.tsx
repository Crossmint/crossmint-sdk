import type { ButtonHTMLAttributes, ReactNode } from "react";
import styled from "@emotion/styled";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { Spinner } from "./Spinner";
import { ScreenReaderText } from "./ScreenReaderText";
import { theme, globalReset } from "@/styles";

interface OAuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: ReactNode;
    children: ReactNode;
    isLoading?: boolean;
    appearance?: UIConfig;
    onButtonClick?: () => void;
}
const StyledButton = styled.button<{
    appearance?: UIConfig;
    isLoading?: boolean;
}>`
    ${globalReset}
    
    /* Base button styles */
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 16px;
    font-size: 16px;
    min-height: 56px;
    border: none;
    border-radius: ${(props) => props.appearance?.borderRadius || "12px"};
    background-color: ${(props) => props.appearance?.colors?.buttonBackground || theme["cm-muted-primary"]};
    color: ${(props) => props.appearance?.colors?.textPrimary || theme["cm-text-primary"]};
    cursor: ${(props) => (props.isLoading ? "not-allowed" : "pointer")};
    
    /* Transitions */
    transition: background-color 200ms ease-in-out;
    
    /* Hover and focus states */
    &:hover {
        background-color: ${(props) => {
            if (props.isLoading) {
                return props.appearance?.colors?.buttonBackground || theme["cm-muted-primary"];
            }
            return props.appearance?.colors?.backgroundSecondary || theme["cm-hover"];
        }};
    }
    
    &:focus {
        outline: none;
        background-color: ${(props) => props.appearance?.colors?.backgroundSecondary || theme["cm-hover"]};
    }
`;

const IconContainer = styled.div`
    position: absolute;
    left: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const ButtonText = styled.span<{ appearance?: UIConfig }>`
    font-weight: 400;
    color: ${(props) => props.appearance?.colors?.textPrimary || theme["cm-text-primary"]};
`;

export function OAuthButton({
    icon,
    children,
    isLoading = false,
    appearance,
    onButtonClick,
    ...props
}: OAuthButtonProps) {
    return (
        <StyledButton
            appearance={appearance}
            isLoading={isLoading}
            onClick={isLoading ? undefined : onButtonClick}
            {...props}
        >
            <IconContainer>{icon}</IconContainer>

            {isLoading ? (
                <Spinner
                    style={{
                        color: appearance?.colors?.textSecondary,
                        fill: appearance?.colors?.textPrimary,
                    }}
                />
            ) : (
                <ButtonText appearance={appearance}>{children}</ButtonText>
            )}

            <ScreenReaderText>{children}</ScreenReaderText>
        </StyledButton>
    );
}
