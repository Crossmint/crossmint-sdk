import styled from "@emotion/styled";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { ChevronRightIcon } from "@/icons/chevronRight";
import { WalletIcon } from "@/icons/wallet";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { ScreenReaderText } from "@/components/common/ScreenReaderText";
import { theme, globalReset } from "@/styles";

const StyledButton = styled.button<{
    appearance?: UIConfig;
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
    cursor: pointer;
    
    /* Transitions */
    transition: background-color 200ms ease-in-out;

    &:hover {
        background-color: ${(props) => props.appearance?.colors?.backgroundSecondary || theme["cm-hover"]};
    }
    
    &:focus {
        outline: none;
        background-color: ${theme["cm-hover"]};
    }
`;

const LeftIconContainer = styled.div`
    position: absolute;
    left: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const RightIconContainer = styled.div`
    position: absolute;
    right: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const ButtonText = styled.span<{ appearance?: UIConfig }>`
    font-weight: 400;
    margin: 0 32px;
    color: ${(props) => props.appearance?.colors?.textPrimary || theme["cm-text-primary"]};
`;

export function Web3AuthFlowButton() {
    const { step, appearance, setStep, setError } = useAuthForm();

    if (step !== "initial") {
        return null;
    }

    return (
        <StyledButton
            appearance={appearance}
            onClick={() => {
                setStep("web3");
                setError(null);
            }}
        >
            <LeftIconContainer>
                <WalletIcon
                    style={{
                        height: "21px",
                        width: "21px",
                        color: appearance?.colors?.textPrimary,
                    }}
                />
            </LeftIconContainer>

            <ButtonText appearance={appearance}>Continue with a wallet</ButtonText>

            <RightIconContainer>
                <ChevronRightIcon
                    style={{
                        height: "21px",
                        width: "21px",
                        color: appearance?.colors?.textSecondary,
                    }}
                />
            </RightIconContainer>

            <ScreenReaderText>Continue with a wallet</ScreenReaderText>
        </StyledButton>
    );
}
