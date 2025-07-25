import type { ReactNode } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import styled from "@emotion/styled";

import FingerprintIcon from "../../icons/fingerprint";
import PasskeyIcon from "../../icons/passkey";
import PasskeyPromptLogo from "../../icons/passkeyPromptLogo";
import { SecuredByCrossmint } from "../common/SecuredByCrossmint";
import { Dialog } from "../common/Dialog";
import { theme } from "@/styles";

const Container = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 10px;
    -webkit-font-smoothing: antialiased;
`;

const LogoContainer = styled.div`
    display: flex;
    justify-content: center;
    position: relative;
    left: 6px;
`;

const TitleContainer = styled.div`
    display: flex;
    justify-content: center;
`;

const Title = styled.p<{ appearance?: UIConfig }>`
    font-size: 18px;
    line-height: 28px;
    font-weight: bold;
    color: ${(props) => props.appearance?.colors?.textPrimary || theme["cm-text-primary"]};
    margin: 0;
`;

const ContentContainer = styled.div`
    margin-bottom: 24px;
`;

const ContentText = styled.div<{ appearance?: UIConfig }>`
    font-weight: normal;
    color: ${(props) => props.appearance?.colors?.textSecondary || theme["cm-text-secondary"]};
    line-height: 1.5;
`;

const ButtonContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    justify-content: center;
`;

const SecuredContainer = styled.div`
    display: flex;
    justify-content: center;
    padding-top: 16px;
`;

const FeatureList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const FeatureItem = styled.div`
    display: flex;
    gap: 8px;
    align-items: flex-start;
`;

const IconContainer = styled.div`
    flex-shrink: 0;
`;

const ContentSection = styled.div`
    margin-bottom: 12px;
`;

const PrimaryButton = styled.button<{ appearance?: UIConfig }>`
    position: relative;
    display: flex;
    font-size: 16px;
    padding: 16px;
    background-color: ${(props) => props.appearance?.colors?.buttonBackground || theme["cm-muted-primary"]};
    color: ${(props) => props.appearance?.colors?.textPrimary || theme["cm-text-primary"]};
    align-items: center;
    width: 100%;
    border-radius: ${(props) => props.appearance?.borderRadius || "12px"};
    justify-content: center;
    transition: all 200ms ease;
    border: none;
    cursor: pointer;
    
    &:hover {
        background-color: ${(props) => props.appearance?.colors?.backgroundSecondary || theme["cm-hover"]};
    }
    
    &:focus {
        background-color: ${(props) => props.appearance?.colors?.backgroundSecondary || theme["cm-hover"]};
        outline: none;
    }
`;

const ButtonText = styled.span<{ appearance?: UIConfig }>`
    font-weight: 500;
    margin: 0 32px;
    color: ${(props) => props.appearance?.colors?.textPrimary || theme["cm-text-primary"]};
`;

const ScreenReaderText = styled.span`
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
`;

const TroubleshootLink = styled.a<{ appearance?: UIConfig }>`
    padding: 14px;
    text-align: center;
    text-decoration: none;
    border-radius: 8px;
    font-weight: bold;
    background-color: ${(props) => props.appearance?.colors?.inputBackground || theme["cm-muted-primary"]};
    color: ${(props) => props.appearance?.colors?.textSecondary || theme["cm-text-primary"]};
    transition: opacity 200ms ease;
    
    &:hover {
        opacity: 0.8;
    }
`;

type PasskeyPromptCoreProps = {
    open: boolean;
    title: string;
    content: ReactNode;
    primaryButton: ReactNode;
    secondaryAction?: ReactNode;
    appearance?: UIConfig;
};

function PasskeyPromptCore({
    title,
    content,
    primaryButton,
    secondaryAction,
    open,
    appearance,
}: PasskeyPromptCoreProps) {
    return (
        <Dialog open={open} appearance={appearance} showCloseButton={false}>
            <Container>
                <LogoContainer>
                    <PasskeyPromptLogo appearance={appearance} />
                </LogoContainer>
                <TitleContainer>
                    <Title appearance={appearance}>{title}</Title>
                </TitleContainer>
                <ContentContainer>
                    <ContentText appearance={appearance}>{content}</ContentText>
                </ContentContainer>
                <ButtonContainer>
                    {primaryButton}
                    {secondaryAction}
                </ButtonContainer>
                <SecuredContainer>
                    <SecuredByCrossmint color={appearance?.colors?.textSecondary} />
                </SecuredContainer>
            </Container>
        </Dialog>
    );
}

type PromptType = "create-wallet" | "transaction" | "not-supported" | "create-wallet-error" | "transaction-error";

type PasskeyPromptProps = {
    state: {
        open: boolean;
        type?: PromptType;
        primaryActionOnClick?: () => void;
        secondaryActionOnClick?: () => void;
    };
    appearance?: UIConfig;
};

const PrimaryButtonComponent = ({
    appearance,
    onClick,
    children,
}: { appearance?: UIConfig; onClick?: () => void; children: ReactNode }) => {
    return (
        <PrimaryButton appearance={appearance} onClick={onClick}>
            <ButtonText appearance={appearance}>{children}</ButtonText>
            <ScreenReaderText>{children}</ScreenReaderText>
        </PrimaryButton>
    );
};

export function PasskeyPrompt({ state, appearance }: PasskeyPromptProps) {
    if (!state.open || state.type == null) {
        return null;
    }

    switch (state.type) {
        case "create-wallet":
            return (
                <PasskeyPromptCore
                    open={state.open}
                    title="Create Your Wallet"
                    appearance={appearance}
                    content={
                        <>
                            <ContentSection>You're about to create a wallet.</ContentSection>
                            <FeatureList>
                                <FeatureItem>
                                    <IconContainer>
                                        <PasskeyIcon />
                                    </IconContainer>
                                    Your wallet will be secured with a passkey
                                </FeatureItem>
                                <FeatureItem>
                                    <IconContainer>
                                        <FingerprintIcon />
                                    </IconContainer>
                                    Your device will ask you for your fingerprint, face, or screen lock to set it up
                                </FeatureItem>
                            </FeatureList>
                        </>
                    }
                    primaryButton={
                        <PrimaryButtonComponent appearance={appearance} onClick={state.primaryActionOnClick}>
                            Create Wallet
                        </PrimaryButtonComponent>
                    }
                />
            );

        case "create-wallet-error":
            return (
                <PasskeyPromptCore
                    open={state.open}
                    title="Wallet Creation Failed"
                    appearance={appearance}
                    content={
                        <div>
                            We couldn't create your wallet. This could be due to rejecting the request, a timeout, or
                            not having access to your passkey on this device.
                        </div>
                    }
                    primaryButton={
                        <PrimaryButtonComponent appearance={appearance} onClick={state.primaryActionOnClick}>
                            Try again
                        </PrimaryButtonComponent>
                    }
                />
            );

        case "transaction":
            return (
                <PasskeyPromptCore
                    open={state.open}
                    title="Use Your Wallet"
                    appearance={appearance}
                    content={
                        <FeatureList>
                            <FeatureItem>
                                <IconContainer>
                                    <FingerprintIcon />
                                </IconContainer>
                                <span>
                                    Your device will ask you for your fingerprint, face, or screen lock to authorize
                                    this action.
                                </span>
                            </FeatureItem>
                        </FeatureList>
                    }
                    primaryButton={
                        <PrimaryButtonComponent appearance={appearance} onClick={state.primaryActionOnClick}>
                            Use Wallet
                        </PrimaryButtonComponent>
                    }
                />
            );

        case "transaction-error":
            return (
                <PasskeyPromptCore
                    open={state.open}
                    title="Wallet Access Failed"
                    appearance={appearance}
                    content={
                        <div>
                            We couldn't access your wallet. This could be due to rejecting the request, a timeout, or
                            not having access to your passkey on this device.
                        </div>
                    }
                    primaryButton={
                        <PrimaryButtonComponent appearance={appearance} onClick={state.primaryActionOnClick}>
                            Try again
                        </PrimaryButtonComponent>
                    }
                    secondaryAction={
                        <TroubleshootLink
                            href="https://docs.crossmint.com/wallets/signers-and-custody#passkey"
                            rel="noopener noreferrer"
                            target="_blank"
                            appearance={appearance}
                        >
                            Troubleshoot
                        </TroubleshootLink>
                    }
                />
            );

        case "not-supported":
            return (
                <PasskeyPromptCore
                    open={state.open}
                    title="Passkeys Not Supported on This Device"
                    appearance={appearance}
                    content={
                        <div>
                            To access your wallet with a passkey, switch to a device or browser that supports passkeys,
                            such as Chrome or Safari on a smartphone, tablet, or modern computer
                        </div>
                    }
                    primaryButton={
                        <PrimaryButtonComponent appearance={appearance} onClick={state.primaryActionOnClick}>
                            Understood
                        </PrimaryButtonComponent>
                    }
                />
            );

        default:
            return null;
    }
}
