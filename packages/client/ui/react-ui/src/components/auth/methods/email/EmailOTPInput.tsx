import { useState } from "react";
import styled from "@emotion/styled";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/common/InputOTP";
import { EmailOtpIcon } from "@/icons/emailOTP";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import type { OtpEmailPayload } from "@/types/auth";
import { AuthFormBackButton } from "../../AuthFormBackButton";
import { useCrossmintAuth } from "@/hooks";
import { CountdownButton } from "@/components/common/CountdownButton";
import { theme } from "@/styles";

const Container = styled.div`
    display: flex;
    flex-direction: column;
`;

const ContentContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
`;

const IconContainer = styled.div`
    position: relative;
    left: 12px;
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
`;

const OTPContainer = styled.div`
    padding: 32px 0;
`;

const StyledInputOTPSlot = styled(InputOTPSlot)`
    @media (max-width: 379px) {
        width: 40px;
        height: 56px;
        font-size: 28px;
        margin: 0;
    }
`;

const HelpText = styled.div<{ appearance?: UIConfig }>`
    font-size: 12px;
    line-height: 1.3;
    text-align: center;
    color: ${(props) => props.appearance?.colors?.textSecondary || theme["cm-text-secondary"]};
`;

export function EmailOTPInput({
    otpEmailData,
    setOtpEmailData,
}: { otpEmailData: OtpEmailPayload | null; setOtpEmailData: (data: OtpEmailPayload | null) => void }) {
    const { crossmintAuth } = useCrossmintAuth();
    const { appearance, setDialogOpen, setStep, setError } = useAuthForm();

    const [token, setToken] = useState("");
    const [hasError, setHasError] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleOnSubmitOTP = async () => {
        setLoading(true);
        try {
            const oneTimeSecret = await crossmintAuth?.confirmEmailOtp(
                otpEmailData?.email ?? "",
                otpEmailData?.emailId ?? "",
                token
            );

            await crossmintAuth?.handleRefreshAuthMaterial(oneTimeSecret as string);
            setDialogOpen(false, true);
            setStep("initial");
        } catch (error) {
            console.error("Error confirming email OTP", error);
            setError("Invalid code. Please try again.");
            setHasError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleOnResendCode = async () => {
        try {
            await crossmintAuth?.sendEmailOtp(otpEmailData?.email ?? "");
        } catch (_e: unknown) {
            setError("Failed to resend code. Please try again.");
        }
    };

    const handleOnBack = () => {
        setStep("initial");
        setOtpEmailData(null);
    };

    return (
        <Container>
            <AuthFormBackButton
                onClick={handleOnBack}
                iconColor={appearance?.colors?.textPrimary}
                ringColor={appearance?.colors?.accent}
            />

            <ContentContainer>
                <IconContainer>
                    <EmailOtpIcon
                        customAccentColor={appearance?.colors?.accent}
                        customButtonBackgroundColor={appearance?.colors?.buttonBackground}
                        customBackgroundColor={appearance?.colors?.background}
                    />
                </IconContainer>

                <Title appearance={appearance}>Check your email</Title>

                <Description appearance={appearance}>
                    A temporary login code has been sent to
                    <br />
                    {otpEmailData?.email ? <strong>{otpEmailData.email}</strong> : "your email address"}
                </Description>

                <OTPContainer>
                    <InputOTP
                        maxLength={6}
                        value={token}
                        onChange={(val) => {
                            setToken(val);
                            setHasError(false);
                            setError(null);
                        }}
                        onComplete={handleOnSubmitOTP}
                        disabled={loading}
                        appearance={appearance}
                    >
                        <InputOTPGroup>
                            <StyledInputOTPSlot index={0} hasError={hasError} />
                            <StyledInputOTPSlot index={1} hasError={hasError} />
                            <StyledInputOTPSlot index={2} hasError={hasError} />
                            <StyledInputOTPSlot index={3} hasError={hasError} />
                            <StyledInputOTPSlot index={4} hasError={hasError} />
                            <StyledInputOTPSlot index={5} hasError={hasError} />
                        </InputOTPGroup>
                    </InputOTP>
                </OTPContainer>

                <HelpText appearance={appearance}>
                    Can't find the email? Check spam folder.
                    <br />
                    Some emails may take several minutes to arrive.
                </HelpText>

                <CountdownButton
                    initialSeconds={60}
                    appearance={appearance}
                    countdownText={(seconds) => `Re-send code in ${seconds}s`}
                    countdownCompleteText="Re-send code"
                    handleOnClick={handleOnResendCode}
                />
            </ContentContainer>
        </Container>
    );
}
