import { useState, type ReactNode } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import styled from "@emotion/styled";
import { Spinner } from "@/components/common/Spinner";
import { theme } from "@/styles";

interface BaseConfirmationProps {
    contactInfo: string;
    icon: ReactNode;
    onConfirm: (contactInfo: string) => Promise<void>;
    onCancel?: () => void;
    appearance?: UIConfig;
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 448px;
    margin: 0 auto;
    border-radius: 12px;
`;

const Heading = styled.h2<{ appearance?: UIConfig }>`
    margin: 6px 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    color: ${(props) => props.appearance?.colors?.textPrimary || theme["cm-text-primary"]};
`;

const ContactContainer = styled.div<{ appearance?: UIConfig }>`
    margin-bottom: 32px;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid ${(props) => props.appearance?.colors?.border || theme["cm-border"]};
`;

const ContactContent = styled.div`
    display: flex;
    align-items: center;
`;

const IconContainer = styled.div`
    flex-shrink: 0;
    margin-right: 12px;
`;

const ContactText = styled.span<{ appearance?: UIConfig }>`
    color: ${(props) => props.appearance?.colors?.textPrimary || theme["cm-text-primary"]};
    font-size: 16px;
    overflow-wrap: anywhere;
`;

const ErrorMessage = styled.div<{ appearance?: UIConfig }>`
    color: ${(props) => props.appearance?.colors?.danger || theme["cm-danger"]};
    margin-bottom: 16px;
    font-size: 14px;
`;

const ButtonContainer = styled.div`
    display: flex;
    gap: 12px;
`;

const BaseButton = styled.button<{ appearance?: UIConfig }>`
    flex: 1;
    padding: 16px 24px;
    border-radius: 9999px;
    text-align: center;
    font-weight: 500;
    font-size: 16px;
    cursor: pointer;
    transition: opacity 200ms ease;
    border: none;
    &:disabled {
        cursor: not-allowed;
    }
`;

const CancelButton = styled(BaseButton)`
    background: transparent;
    border: 1px solid ${(props) => props.appearance?.colors?.border || theme["cm-border"]};
    color: ${(props) => props.appearance?.colors?.textPrimary || theme["cm-text-primary"]};
    &:hover:not(:disabled) {
        opacity: 0.8;
    }
`;

const SendButton = styled(BaseButton)<{ isLoading?: boolean; appearance?: UIConfig }>`
    background-color: ${(props) => props.appearance?.colors?.accent || theme["cm-accent"]};
    color: white;
    opacity: ${(props) => (props.isLoading ? 0.7 : 1)};
    &:hover:not(:disabled) {
        opacity: 0.9;
    }
`;

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
`;

export function BaseConfirmation({ contactInfo, icon, onConfirm, onCancel, appearance }: BaseConfirmationProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSendCode = async () => {
        setIsLoading(true);
        setError("");
        try {
            await onConfirm(contactInfo);
        } catch (error) {
            console.error(`Error sending authorization code:`, error);
            setError("Failed to send code. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Container>
            <Heading appearance={appearance}>Send authorization code to</Heading>

            <ContactContainer appearance={appearance}>
                <ContactContent>
                    <IconContainer>{icon}</IconContainer>
                    <ContactText appearance={appearance}>{contactInfo}</ContactText>
                </ContactContent>
            </ContactContainer>

            {error && <ErrorMessage appearance={appearance}>{error}</ErrorMessage>}

            <ButtonContainer>
                <CancelButton onClick={onCancel} appearance={appearance}>
                    Cancel
                </CancelButton>

                <SendButton onClick={handleSendCode} disabled={isLoading} isLoading={isLoading} appearance={appearance}>
                    {isLoading ? (
                        <LoadingContainer>
                            <Spinner
                                style={{ color: appearance?.colors?.background || theme["cm-background-primary"] }}
                            />
                        </LoadingContainer>
                    ) : (
                        "Send code"
                    )}
                </SendButton>
            </ButtonContainer>
        </Container>
    );
}
