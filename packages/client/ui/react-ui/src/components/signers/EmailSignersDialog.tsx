import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../common/Dialog";
import { EmailOTPInput } from "./EmailOTPInput";
import { EmailInput } from "./EmailInput";

interface EmailSignersDialogProps {
    email: string;
    setEmail: (email: string) => void;
    open: boolean;
    setOpen: (open: boolean) => void;
    step: "initial" | "otp";
    setStep: (step: "initial" | "otp") => void;
    onSubmitOTP: (token: string) => Promise<void>;
    onResendOTPCode: (email: string) => Promise<void>;
    onSubmitEmail: (email: string) => Promise<void>;
    appearance?: UIConfig;
}

export function EmailSignersDialog({
    email,
    setEmail,
    open,
    setOpen,
    step,
    setStep,
    onSubmitOTP,
    onResendOTPCode,
    onSubmitEmail,
    appearance,
}: EmailSignersDialogProps) {
    return (
        <Dialog modal={false} open={open} onOpenChange={setOpen}>
            <DialogContent
                onInteractOutside={(e) => e.preventDefault()}
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="!p-0 !min-[480px]:p-0"
                style={{
                    borderRadius: appearance?.borderRadius,
                    backgroundColor: appearance?.colors?.background,
                }}
            >
                <VisuallyHidden asChild>
                    <DialogTitle>Crossmint Recovery Key</DialogTitle>
                </VisuallyHidden>
                <VisuallyHidden asChild>
                    <DialogDescription>Create a recovery key</DialogDescription>
                </VisuallyHidden>

                <div className="relative pt-10 pb-[30px] px-6 !min-[480px]:px-10 flex flex-col gap-[10px] antialiased animate-none max-w-[448px]">
                    {step === "initial" ? (
                        <div>
                            <h1
                                className="text-2xl font-bold text-cm-text-primary"
                                style={{ color: appearance?.colors?.textPrimary }}
                            >
                                Create Recovery Key
                            </h1>
                            <p
                                className="text-base font-normal mb-3 text-cm-text-secondary"
                                style={{ color: appearance?.colors?.textSecondary }}
                            >
                                Enter your email to create a recovery key
                            </p>
                        </div>
                    ) : null}

                    {step === "otp" ? (
                        <EmailOTPInput
                            email={email}
                            onSubmitOTP={onSubmitOTP}
                            handleOnBack={() => setStep("initial")}
                            onResendCode={() => onResendOTPCode(email)}
                            appearance={appearance}
                        />
                    ) : (
                        <EmailInput
                            email={email}
                            setEmail={setEmail}
                            onSubmitEmail={onSubmitEmail}
                            appearance={appearance}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
