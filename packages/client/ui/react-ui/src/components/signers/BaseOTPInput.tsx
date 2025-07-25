import { useState, useRef, type ReactNode } from "react";
import styled from "@emotion/styled";
import { CountdownButton } from "@/components/common/CountdownButton";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/common/InputOTP";
import { theme } from "@/styles";

const OTP_LENGTH = 9;

interface BaseOTPInputProps {
    contactInfo: string;
    contactType: "email" | "phone";
    icon: ReactNode;
    title: string;
    description: string;
    helpText: string;
    onSubmitOTP: (token: string) => Promise<void>;
    onResendCode?: () => Promise<void>;
    appearance?: UIConfig;
    otpLength?: number;
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
`;

const Title = styled.p<{ appearance?: UIConfig }>`
    font-size: 16px;
    font-weight: 400;
    margin: 16px 0 4px 0;
    text-align: center;
    color: ${(props) => props.appearance?.colors?.textPrimary || theme["cm-text-primary"]};
`;

const Description = styled.p<{ appearance?: UIConfig }>`
    text-align: center;
    padding: 0 16px;
    margin: 0;
    color: ${(props) => props.appearance?.colors?.textSecondary || theme["cm-text-secondary"]};
    font-size: 14px;
    line-height: 1.4;
    overflow-wrap: anywhere;
`;

const OTPContainer = styled.div`
    padding: 32px 0;
`;

const StyledInputOTPSlot = styled(InputOTPSlot)`
    /* Mobile styles */
     @media (max-width: 479px) {
        width: 32px;
        height: 44px;
        font-size: 20px;
        margin: 0;
    }
    /* Mobile styles (small devices) */
    @media (max-width: 379px) {
        width: 24px;
        height: 36px;
        font-size: 16px;
        margin: 0;
    }
    /* Desktop styles */
    @media (min-width: 480px) {
        height: 48px;
        width: 36px;
    }
`;

const ErrorMessage = styled.div<{ appearance?: UIConfig }>`
    font-size: 14px;
    color: ${(props) => props.appearance?.colors?.danger || theme["cm-danger"]};
    margin-bottom: 16px;
`;

const HelpText = styled.div<{ appearance?: UIConfig }>`
    font-size: 12px;
    line-height: 1.3;
    text-align: center;
    color: ${(props) => props.appearance?.colors?.textSecondary || theme["cm-text-secondary"]};
    margin-bottom: 16px;
`;

export function BaseOTPInput({
    contactType,
    icon,
    title,
    description,
    onSubmitOTP,
    onResendCode,
    appearance,
    otpLength = OTP_LENGTH,
    helpText,
}: BaseOTPInputProps) {
    const [token, setToken] = useState("");
    const [hasError, setHasError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const otpRef = useRef<HTMLInputElement>(null);

    const handleOnSubmitOTP = async () => {
        setLoading(true);
        try {
            await onSubmitOTP(token);
            setHasError(false);
            setError(null);
        } catch (error) {
            console.error(`Error confirming ${contactType} OTP:`, error);
            setError("Invalid code. Please try again.");
            setHasError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container>
            {icon}

            <Title appearance={appearance}>{title}</Title>

            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Fine for this case */}
            <Description appearance={appearance} dangerouslySetInnerHTML={{ __html: description }} />

            <OTPContainer>
                <InputOTP
                    ref={otpRef}
                    maxLength={otpLength}
                    value={token}
                    onChange={(val) => {
                        const wasError = hasError;
                        setToken(val);
                        setHasError(false);
                        setError(null);

                        // If we just cleared an error, maintain focus
                        if (wasError && otpRef.current) {
                            setTimeout(() => {
                                otpRef.current?.focus();
                            }, 0);
                        }
                    }}
                    onComplete={handleOnSubmitOTP}
                    disabled={loading}
                    appearance={appearance}
                    style={{ overflow: "hidden" }}
                >
                    <InputOTPGroup>
                        {Array.from({ length: otpLength }).map((_, index) => (
                            <StyledInputOTPSlot key={index} index={index} hasError={hasError} />
                        ))}
                    </InputOTPGroup>
                </InputOTP>
            </OTPContainer>

            {error && <ErrorMessage appearance={appearance}>{error}</ErrorMessage>}

            <HelpText appearance={appearance}>{helpText}</HelpText>

            {onResendCode && (
                <CountdownButton
                    initialSeconds={60}
                    appearance={appearance}
                    countdownText={(seconds) => `Re-send code in ${seconds}s`}
                    countdownCompleteText="Re-send code"
                    handleOnClick={onResendCode}
                />
            )}
        </Container>
    );
}
