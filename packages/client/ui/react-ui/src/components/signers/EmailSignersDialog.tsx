import type { MutableRefObject } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { Dialog, DialogDescription, DialogTitle } from "../common/Dialog";
import { BaseCodeInput } from "./BaseCodeInput";
import { EmailOtpIcon } from "@/icons/emailOTP";
import { BaseConfirmation } from "./BaseConfirmation";
import { MailIcon } from "@/icons/mail";

interface EmailSignersDialogProps {
    email?: string;
    open: boolean;
    setOpen: (open: boolean) => void;
    step: "initial" | "otp";
    onSubmitOTP: (token: string) => Promise<void>;
    onResendOTPCode: () => Promise<void>;
    onSubmitEmail: () => Promise<void>;
    rejectRef: MutableRefObject<((error: Error) => void) | undefined>;
    appearance?: UIConfig;
}

export function EmailSignersDialog({
    email,
    open,
    setOpen,
    step,
    onSubmitOTP,
    onResendOTPCode,
    onSubmitEmail,
    rejectRef,
    appearance,
}: EmailSignersDialogProps) {
    function handleOnCancel(isOpen?: boolean) {
        if (open || isOpen) {
            rejectRef.current?.(new Error());
            setOpen(false);
        }
    }

    return (
        <Dialog open={open} setDialogOpen={handleOnCancel} appearance={appearance} style={{ overflow: "hidden" }}>
            {step === "initial" ? (
                <>
                    <DialogTitle appearance={appearance}>Confirm it's you</DialogTitle>
                    <DialogDescription appearance={appearance}>
                        You're using this wallet for the first time on this device. Click 'Send code' to get a one-time
                        verification code.
                    </DialogDescription>
                </>
            ) : null}

            {step === "otp" ? (
                <BaseCodeInput
                    contactInfo={email ?? ""}
                    contactType="email"
                    icon={
                        <div style={{ position: "relative", left: "12px" }}>
                            <EmailOtpIcon
                                customAccentColor={appearance?.colors?.accent}
                                customButtonBackgroundColor={appearance?.colors?.buttonBackground}
                                customBackgroundColor={appearance?.colors?.background}
                            />
                        </div>
                    }
                    title="Check your email"
                    description={`A temporary login code has been sent to <strong>${email}</strong>`}
                    helpText={`Can't find the email? Check spam folder. \nSome emails may take several minutes to arrive.`}
                    onSubmitOTP={onSubmitOTP}
                    onResendCode={onResendOTPCode}
                    appearance={appearance}
                />
            ) : (
                <BaseConfirmation
                    contactInfo={email ?? ""}
                    icon={<MailIcon />}
                    onConfirm={onSubmitEmail}
                    onCancel={handleOnCancel}
                    appearance={appearance}
                />
            )}
        </Dialog>
    );
}
