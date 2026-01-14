import { type ReactNode, type MutableRefObject, useEffect } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import type { SignerAuthHandlers, SignerAuthState } from "@/hooks/useSignerAuth";
import type { CreateOnLogin } from "@/types";
import { useLogger } from "./LoggerProvider";
import { LoggerContext } from "./CrossmintProvider";
import type { PasskeyPromptState } from "./CrossmintWalletBaseProvider";
import { useWallet } from "@/hooks/useWallet";

export interface CrossmintWalletUIBaseProviderProps {
    children: ReactNode;
    appearance?: UIConfig;
    createOnLogin?: CreateOnLogin;
    headlessSigningFlow?: boolean;
    showPasskeyHelpers?: boolean;
    renderUI?: (props: UIRenderProps) => ReactNode;
    passkeyPromptState: PasskeyPromptState;
    signerAuth: SignerAuthState & SignerAuthHandlers;
}

export interface UIRenderProps {
    emailSignerProps: {
        email?: string;
        open: boolean;
        setOpen: (open: boolean) => void;
        step: "initial" | "otp";
        onSubmitOTP: (token: string) => Promise<void>;
        onResendOTPCode: () => Promise<void>;
        onSubmitEmail: () => Promise<void>;
        rejectRef: MutableRefObject<(error?: Error) => void>;
        appearance?: UIConfig;
    };

    phoneSignerProps: {
        phone?: string;
        open: boolean;
        setOpen: (open: boolean) => void;
        step: "initial" | "otp";
        onSubmitOTP: (token: string) => Promise<void>;
        onResendOTPCode: () => Promise<void>;
        onSubmitPhone: () => Promise<void>;
        rejectRef: MutableRefObject<(error?: Error) => void>;
        appearance?: UIConfig;
    };

    passkeyPromptProps?: {
        state: PasskeyPromptState;
        appearance?: UIConfig;
    };
}

export function CrossmintWalletUIBaseProvider({
    children,
    appearance,
    createOnLogin,
    headlessSigningFlow,
    renderUI,
    passkeyPromptState,
    signerAuth,
}: CrossmintWalletUIBaseProviderProps) {
    const logger = useLogger(LoggerContext);

    useEffect(() => {
        logger.info("CrossmintWalletUIBaseProvider: createOnLogin", { createOnLogin });
    }, [createOnLogin, logger]);

    const { wallet } = useWallet();

    const signerType = wallet?.signer.type;
    const signerLocator = wallet?.signer.locator().split(":")[1];

    useEffect(() => {
        logger.info("CrossmintWalletUIBaseProvider: wallet", { wallet });
        logger.info("CrossmintWalletUIBaseProvider: wallet.signer.type", { signerType: wallet?.signer.type });
        logger.info("CrossmintWalletUIBaseProvider: wallet.signer.locator", {
            signerLocator: wallet?.signer.locator().split(":")[1],
        });
    }, [wallet, logger]);

    console.log("CrossmintWalletUIBaseProvider: signerAuth.emailSignerDialogOpen", {
        emailSignerDialogOpen: signerAuth.emailSignerDialogOpen,
    });

    const uiRenderProps: UIRenderProps = {
        emailSignerProps: {
            email: signerType === "email" ? signerLocator : undefined,
            open: signerAuth.emailSignerDialogOpen && signerType === "email" && signerLocator != null,
            setOpen: signerAuth.setEmailSignerDialogOpen,
            step: signerAuth.emailSignerDialogStep,
            onSubmitOTP: signerAuth.emailsigners_handleOTPSubmit,
            onResendOTPCode: signerAuth.emailsigners_handleResendOTP,
            onSubmitEmail: signerAuth.emailsigners_handleSendEmailOTP,
            rejectRef: signerAuth.rejectRef,
            appearance,
        },
        phoneSignerProps: {
            phone: signerType === "phone" ? signerLocator : undefined,
            open: signerAuth.phoneSignerDialogOpen && signerType === "phone" && signerLocator != null,
            setOpen: signerAuth.setPhoneSignerDialogOpen,
            step: signerAuth.phoneSignerDialogStep,
            onSubmitOTP: signerAuth.phonesigners_handleOTPSubmit,
            onResendOTPCode: signerAuth.phonesigners_handleResendOTP,
            onSubmitPhone: signerAuth.phonesigners_handleSendPhoneOTP,
            rejectRef: signerAuth.rejectRef,
            appearance,
        },
        passkeyPromptProps: {
            state: passkeyPromptState,
            appearance,
        },
    };

    return (
        <>
            {children}
            {!headlessSigningFlow && renderUI != null && renderUI(uiRenderProps)}
        </>
    );
}
