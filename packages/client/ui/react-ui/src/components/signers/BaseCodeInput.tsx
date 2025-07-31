import { useState, type ReactNode } from "react";
import styled from "@emotion/styled";
import { CountdownButton } from "@/components/common/CountdownButton";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { globalReset, theme } from "@/styles";
import Color from "color";
import { ScreenReaderText } from "../common/ScreenReaderText";
import { AlertIcon } from "@/icons/alert";
import { Spinner } from "../common/Spinner";

interface BaseCodeInputProps {
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

const InputContainer = styled.div`
    width: 100%;
    padding: 28px 0px 16px
`;

const Form = styled.form`
    position: relative;
`;

const OTPCodeInput = styled.input<{
    appearance?: UIConfig;
    hasError?: boolean;
}>`
    ${globalReset}
    
    /* Base input styles */
    display: flex;
    flex-grow: 1;
    text-align: left;
    padding-left: 16px;
    padding-right: 80px;
    height: 58px;
    width: 100%;
    border: 1px solid;
    border-color: ${(props) =>
        props.hasError
            ? props.appearance?.colors?.danger || theme["cm-danger"]
            : props.appearance?.colors?.border || theme["cm-border"]};
    border-radius: ${(props) => props.appearance?.borderRadius || "12px"};
    background-color: ${(props) => props.appearance?.colors?.inputBackground || theme["cm-background-primary"]};
    color: ${(props) => props.appearance?.colors?.textPrimary || theme["cm-text-primary"]};
    font-size: 16px;
    transition: border-color 200ms ease-in-out, box-shadow 200ms ease-in-out;
    
    &::placeholder {
        font-weight: 400;
        color: ${(props) => props.appearance?.colors?.textSecondary || theme["cm-text-secondary"]};
    }
    
    &:focus {
        outline: none;
        box-shadow: 0 0 0 2px ${(props) =>
            new Color(props.appearance?.colors?.accent || theme["cm-accent"]).alpha(0.18).toString()};
    }
    
    &:read-only {
        cursor: not-allowed;
        opacity: 0.7;
    }
`;

const InputActions = styled.div`
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    padding-right: 16px;
    aspect-ratio: 1/1;
`;

const SubmitButton = styled.button<{
    appearance?: UIConfig;
    disabled?: boolean;
}>`
    ${globalReset}
    
    font-weight: 500;
    white-space: nowrap;
    background-color: ${(props) => props.appearance?.colors?.inputBackground || theme["cm-background-primary"]};
    color: ${(props) => props.appearance?.colors?.accent || theme["cm-accent"]};
    cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
    opacity: ${(props) => (props.disabled ? 0.6 : 1)};
    border: none;
    padding: 8px 12px;
    border-radius: 6px;
    transition: opacity 200ms ease;
    
    &:hover:not(:disabled) {
        opacity: 0.8;
    }
    
    &:focus-visible {
        outline: 2px solid ${(props) => props.appearance?.colors?.accent || theme["cm-accent"]};
        outline-offset: 2px;
    }

    &:not(:disabled):focus-visible {
        box-shadow: 0 0 0 2px ${(props) =>
            new Color(props.appearance?.colors?.accent || theme["cm-accent"]).alpha(0.18).toString()};
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

export function BaseCodeInput({
    contactType,
    icon,
    title,
    description,
    onSubmitOTP,
    onResendCode,
    appearance,
    otpLength = 9,
    helpText,
}: BaseCodeInputProps) {
    const [otpCode, setOtpCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasError = error != null;

    const isCodeValidLength = otpCode.length === otpLength;

    const handleOnSubmitOTP = async () => {
        setLoading(true);
        try {
            await onSubmitOTP(otpCode);
            setError(null);
        } catch (err) {
            console.error(`Error confirming ${contactType} OTP:`, err);
            setError("Invalid code. Please try again.");
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

            <InputContainer>
                <Form
                    role="form"
                    onSubmit={(e) => {
                        if (!isCodeValidLength) {
                            return;
                        }
                        e.preventDefault();
                        handleOnSubmitOTP();
                    }}
                    noValidate
                >
                    <ScreenReaderText>OTP Code</ScreenReaderText>
                    <OTPCodeInput
                        id="otpInput"
                        maxLength={otpLength}
                        appearance={appearance}
                        hasError={hasError}
                        type="text"
                        placeholder="Enter code"
                        value={otpCode}
                        onChange={(e) => {
                            setOtpCode(e.target.value);
                            setError(null);
                        }}
                        readOnly={loading}
                        aria-describedby="otpError"
                    />
                    <InputActions>
                        {hasError && <AlertIcon customColor={appearance?.colors?.danger} />}
                        {loading && (
                            <Spinner
                                style={{
                                    color: appearance?.colors?.textSecondary,
                                    fill: appearance?.colors?.textPrimary,
                                }}
                            />
                        )}
                        {!hasError && !loading ? (
                            <SubmitButton
                                type="submit"
                                appearance={appearance}
                                disabled={!isCodeValidLength || loading}
                            >
                                Submit
                            </SubmitButton>
                        ) : null}
                    </InputActions>
                </Form>
            </InputContainer>

            {hasError && <ErrorMessage appearance={appearance}>{error}</ErrorMessage>}

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
