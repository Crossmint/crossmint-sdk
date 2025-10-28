import { type FormEvent, useState } from "react";
import Color from "color";
import styled from "@emotion/styled";
import { isEmailValid } from "@crossmint/common-sdk-auth";
import type { UIConfig } from "@crossmint/common-sdk-base";

import { Spinner } from "@/components/common/Spinner";
import { AlertIcon } from "../../../../icons/alert";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import type { OtpEmailPayload } from "@/types/auth";
import { useCrossmintAuth } from "@/hooks";
import { ContinueWithGoogle } from "../google/ContinueWithGoogle";
import { ScreenReaderText } from "@/components/common/ScreenReaderText";
import { theme, globalReset } from "@/styles";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    width: 100%;
    border-radius: 8px;
`;

const InputContainer = styled.div`
    width: 100%;
`;

const Label = styled.label<{ appearance?: UIConfig }>`
    display: block;
    margin-bottom: 5px;
    color: ${(props) => props.appearance?.colors?.textPrimary || theme["cm-text-primary"]};
    font-size: 14px;
    font-weight: 400;
`;

const Form = styled.form`
    position: relative;
`;

const EmailInput = styled.input<{
    appearance?: UIConfig;
    hasError?: boolean;
    showGoogleButton?: boolean;
}>`
    ${globalReset}
    
    /* Base input styles */
    display: flex;
    flex-grow: 1;
    text-align: left;
    padding-left: 16px;
    padding-right: ${(props) => (props.showGoogleButton ? "132px" : "80px")};
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

const ErrorText = styled.p<{ appearance?: UIConfig }>`
    font-size: 12px;
    color: ${(props) => props.appearance?.colors?.danger || theme["cm-danger"]};
    margin: 8px 0 8px 0;
`;

export function EmailSignIn({ setOtpEmailData }: { setOtpEmailData: (data: OtpEmailPayload) => void }) {
    const { crossmintAuth } = useCrossmintAuth();
    const { appearance, defaultEmail, setStep, setError, loginMethods } = useAuthForm();

    const [emailInput, setEmailInput] = useState(defaultEmail ?? "");
    const [emailError, setEmailError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    /** Continue with google button will only show under the following conditions:
     * 1. Email is a gmail address
     * 2. Email DOES NOT contain a "+" character
     * 3. Email is valid
     */
    const showGoogleContinueButton =
        emailInput.toLowerCase().includes("@gmail.com") &&
        !emailInput.toLowerCase().includes("+") &&
        isEmailValid(emailInput) &&
        !isLoading &&
        loginMethods.includes("google");

    async function handleOnSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        setIsLoading(true);

        try {
            const trimmedEmailInput = emailInput.trim().toLowerCase();
            const emailSignInRes = (await crossmintAuth?.sendEmailOtp(trimmedEmailInput)) as { emailId: string };

            setOtpEmailData({ email: trimmedEmailInput, emailId: emailSignInRes.emailId });
            setStep("otp");
        } catch (_e: unknown) {
            setIsLoading(false);
            setError("Failed to send email. Please try again or contact support.");
        }
    }

    return (
        <Container>
            <InputContainer>
                <Label appearance={appearance}>Email</Label>
                <Form
                    role="form"
                    onSubmit={(e) => {
                        if (showGoogleContinueButton) {
                            e.preventDefault();
                            return;
                        }
                        if (isEmailValid(emailInput)) {
                            handleOnSubmit(e);
                        } else {
                            e.preventDefault();
                        }
                    }}
                    noValidate
                >
                    <ScreenReaderText>Email</ScreenReaderText>
                    <EmailInput
                        id="emailInput"
                        appearance={appearance}
                        hasError={!!emailError}
                        showGoogleButton={showGoogleContinueButton}
                        type="email"
                        placeholder="your@email.com"
                        value={emailInput}
                        onChange={(e) => {
                            setEmailInput(e.target.value);
                            setEmailError("");
                            setError(null);
                        }}
                        readOnly={isLoading}
                        aria-describedby="emailError"
                    />
                    <InputActions>
                        {emailError && <AlertIcon customColor={appearance?.colors?.danger} />}
                        {isLoading && (
                            <Spinner
                                style={{
                                    color: appearance?.colors?.textSecondary,
                                    fill: appearance?.colors?.textPrimary,
                                }}
                            />
                        )}
                        {showGoogleContinueButton ? (
                            <ContinueWithGoogle emailInput={emailInput} appearance={appearance} />
                        ) : !emailError && !isLoading ? (
                            <SubmitButton
                                type="submit"
                                appearance={appearance}
                                disabled={!isEmailValid(emailInput) || isLoading}
                            >
                                Submit
                            </SubmitButton>
                        ) : null}
                    </InputActions>
                </Form>
                {emailError && (
                    <ErrorText appearance={appearance} id="emailError">
                        {emailError}
                    </ErrorText>
                )}
            </InputContainer>
        </Container>
    );
}
