import type { MutableRefObject } from "react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../common/Dialog";
import { EmailOTPInput } from "./EmailOTPInput";
import { EmailConfirmation } from "./EmailConfirmation";
import { tw } from "@/twind-instance";

interface EmailSignersDialogProps {
    email: string;
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
    if (email == null) {
        throw new Error("Email is required");
    }

    function handleOnCancel(isOpen?: boolean) {
        if (open || isOpen) {
            rejectRef.current?.(new Error());
            setOpen(false);
        }
    }

    return (
        <Dialog modal={false} open={open} onOpenChange={handleOnCancel}>
            <DialogContent
                onInteractOutside={(e) => e.preventDefault()}
                onOpenAutoFocus={(e) => e.preventDefault()}
                className={tw("!p-0 !min-[480px]:p-0")}
                style={{
                    borderRadius: appearance?.borderRadius,
                    backgroundColor: appearance?.colors?.background,
                }}
            >
                <VisuallyHidden asChild>
                    <DialogTitle>Confirm it's you</DialogTitle>
                </VisuallyHidden>
                <VisuallyHidden asChild>
                    <DialogDescription>Create a recovery key</DialogDescription>
                </VisuallyHidden>

                <div
                    className={tw(
                        "relative pt-10 pb-[30px] px-6 !min-[480px]:px-10 flex flex-col gap-[10px] antialiased animate-none max-w-[448px]"
                    )}
                >
                    {step === "initial" ? (
                        <div className={tw("flex flex-col gap-4")}>
                            <h1
                                className={tw("text-2xl font-bold text-cm-text-primary")}
                                style={{ color: appearance?.colors?.textPrimary }}
                            >
                                Confirm it's you
                            </h1>
                            <p
                                className={tw("text-base font-normal mb-3 text-cm-text-secondary")}
                                style={{ color: appearance?.colors?.textSecondary }}
                            >
                                You're using this wallet for the first time on this device. Click 'Send code' to get a
                                one-time verification code.
                            </p>
                        </div>
                    ) : null}

                    {step === "otp" ? (
                        <EmailOTPInput
                            email={email}
                            onSubmitOTP={onSubmitOTP}
                            onResendCode={onResendOTPCode}
                            appearance={appearance}
                        />
                    ) : (
                        <EmailConfirmation
                            email={email}
                            onConfirm={onSubmitEmail}
                            onCancel={handleOnCancel}
                            appearance={appearance}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
