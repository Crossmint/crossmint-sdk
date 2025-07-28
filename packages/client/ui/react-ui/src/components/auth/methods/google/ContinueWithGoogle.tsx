import type { UIConfig } from "@crossmint/common-sdk-base";
import { Spinner } from "@/components/common/Spinner";
import { useOAuthFlow } from "@/providers/auth/OAuthFlowProvider";
import { GoogleIcon } from "@/icons/google";
import styled from "@emotion/styled";
import { theme, globalReset } from "@/styles";

const ContinueButton = styled.button<{
    appearance?: UIConfig;
    isLoading?: boolean;
}>`
    ${globalReset}
    
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 32px;
    padding: 0 10px;
    border: 1px solid ${(props) => props.appearance?.colors?.border || theme["cm-border"]};
    border-radius: ${(props) => props.appearance?.borderRadius || "12px"};
    background-color: ${(props) => props.appearance?.colors?.buttonBackground || theme["cm-background-primary"]};
    cursor: ${(props) => (props.isLoading ? "not-allowed" : "pointer")};
    
    /* Hover and focus states */
    &:hover {
        background-color: ${(props) => {
            if (props.isLoading) {
                return theme["cm-muted-primary"];
            }
            return theme["cm-hover"];
        }};
    }
    
    &:focus {
        outline: none;
        background-color: theme["cm-hover"];
    }
`;

const ContinueText = styled.span<{ appearance?: UIConfig }>`
    color: ${(props) => props.appearance?.colors?.accent || theme["cm-accent"]};
    font-size: 14px;
    font-weight: 400;
`;

export function ContinueWithGoogle({ emailInput, appearance }: { emailInput: string; appearance?: UIConfig }) {
    const { startOAuthLogin, activeOAuthProvider } = useOAuthFlow();
    const isLoading = activeOAuthProvider === "google";

    return (
        <ContinueButton
            type="button"
            appearance={appearance}
            isLoading={isLoading}
            onClick={isLoading ? undefined : () => startOAuthLogin("google", emailInput.trim().toLowerCase())}
        >
            <GoogleIcon style={{ height: "18px", width: "18px" }} />
            {isLoading ? (
                <Spinner
                    style={{
                        color: appearance?.colors?.textSecondary,
                        fill: appearance?.colors?.textPrimary,
                        width: "18px",
                        height: "18px",
                    }}
                />
            ) : (
                <ContinueText appearance={appearance}>Continue</ContinueText>
            )}
        </ContinueButton>
    );
}
