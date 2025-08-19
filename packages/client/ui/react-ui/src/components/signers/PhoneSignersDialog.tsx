import type { MutableRefObject } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { Dialog, DialogDescription, DialogTitle } from "../common/Dialog";
import { BaseCodeInput } from "./BaseCodeInput";
import { BaseConfirmation } from "./BaseConfirmation";
import { PhoneIcon } from "@/icons/phone";
import { PhoneOtpIcon } from "@/icons/phoneOTP";
import { useWallet } from "@/hooks";

interface PhoneSignersDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    step: "initial" | "otp";
    onSubmitOTP: (token: string) => Promise<void>;
    onResendOTPCode: () => Promise<void>;
    onSubmitPhone: () => Promise<void>;
    rejectRef: MutableRefObject<((error: Error) => void) | undefined>;
    appearance?: UIConfig;
}

export function PhoneSignersDialog({
    open,
    setOpen,
    step,
    onSubmitOTP,
    onResendOTPCode,
    onSubmitPhone,
    rejectRef,
    appearance,
}: PhoneSignersDialogProps) {
    const { wallet } = useWallet();
    if (wallet?.signer.type !== "phone") {
        return null;
    }
    const phone = wallet?.signer.phone;

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
                        verification code via SMS.
                    </DialogDescription>
                </>
            ) : null}

            {step === "otp" ? (
                <BaseCodeInput
                    contactInfo={phone ?? ""}
                    contactType="phone"
                    icon={
                        <PhoneOtpIcon
                            customAccentColor={appearance?.colors?.accent}
                            customBackgroundColor={appearance?.colors?.background}
                        />
                    }
                    title="Check your phone"
                    description={
                        <>
                            A temporary login code has been sent via SMS to <strong>{phone}</strong>
                        </>
                    }
                    helpText={`Can't receive the SMS? Check your phone number.\nSome messages may take several minutes to arrive.`}
                    onSubmitOTP={onSubmitOTP}
                    onResendCode={onResendOTPCode}
                    appearance={appearance}
                />
            ) : (
                <BaseConfirmation
                    contactInfo={phone ?? ""}
                    icon={<PhoneIcon />}
                    onConfirm={onSubmitPhone}
                    onCancel={handleOnCancel}
                    appearance={appearance}
                />
            )}
        </Dialog>
    );
}
