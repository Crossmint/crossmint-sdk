import { type ReactNode, useCallback, useState, type MutableRefObject } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import { CrossmintWalletBaseProvider } from "./CrossmintWalletBaseProvider";
import { useCrossmint } from "@/hooks/useCrossmint";
import { useSignerAuth } from "@/hooks/useSignerAuth";
import type { CreateOnLogin } from "@/types";
import { useLogger } from "./LoggerProvider";
import { LoggerContext } from "./CrossmintProvider";

export interface CrossmintWalletUIBaseProviderProps {
    children: ReactNode;
    appearance?: UIConfig;
    createOnLogin?: CreateOnLogin;
    headlessSigningFlow?: boolean;
    showPasskeyHelpers?: boolean;
    callbacks?: {
        onWalletCreationStart?: () => Promise<void>;
        onTransactionStart?: () => Promise<void>;
    };
    initializeWebView?: () => Promise<void>;
    renderUI?: (props: UIRenderProps) => ReactNode;
    clientTEEConnection?: () => HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
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
        state: {
            open: boolean;
            type?: ValidPasskeyPromptType;
            primaryActionOnClick?: () => void;
            secondaryActionOnClick?: () => void;
        };
        appearance?: UIConfig;
    };
}

type ValidPasskeyPromptType =
    | "create-wallet"
    | "transaction"
    | "not-supported"
    | "create-wallet-error"
    | "transaction-error";

type PasskeyPromptState = {
    open: boolean;
    type?: ValidPasskeyPromptType;
    primaryActionOnClick?: () => void;
    secondaryActionOnClick?: () => void;
};

export function CrossmintWalletUIBaseProvider({
    children,
    appearance,
    createOnLogin,
    headlessSigningFlow,
    showPasskeyHelpers = true,
    callbacks,
    initializeWebView,
    renderUI,
    clientTEEConnection,
}: CrossmintWalletUIBaseProviderProps) {
    const { experimental_customAuth } = useCrossmint();
    const [passkeyPromptState, setPasskeyPromptState] = useState<PasskeyPromptState>({ open: false });
    const logger = useLogger(LoggerContext);
    logger.info("CrossmintWalletUIBaseProvider: createOnLogin", { createOnLogin });
    logger.info("CrossmintWalletUIBaseProvider: experimental_customAuth", { experimental_customAuth });

    const signerAuth = useSignerAuth(createOnLogin);

    const email =
        createOnLogin?.signer.type === "email" && createOnLogin?.signer.email != null
            ? createOnLogin.signer.email
            : experimental_customAuth?.email;
    logger.info("CrossmintWalletUIBaseProvider: email", { email });
    const phoneNumber =
        createOnLogin?.signer.type === "phone" && createOnLogin?.signer.phone != null
            ? createOnLogin.signer.phone
            : experimental_customAuth?.phone;

    const createPasskeyPrompt = useCallback(
        (type: ValidPasskeyPromptType) => () =>
            new Promise<void>((resolve) => {
                if (!showPasskeyHelpers) {
                    resolve();
                    return;
                }
                setPasskeyPromptState({
                    type,
                    open: true,
                    primaryActionOnClick: () => {
                        setPasskeyPromptState({ open: false });
                        resolve();
                    },
                    secondaryActionOnClick: () => {
                        setPasskeyPromptState({ open: false });
                        resolve();
                    },
                });
            }),
        [showPasskeyHelpers]
    );

    const getCallbacks = useCallback(() => {
        let onWalletCreationStart = callbacks?.onWalletCreationStart;
        let onTransactionStart = callbacks?.onTransactionStart;

        if (createOnLogin?.signer.type === "passkey" && showPasskeyHelpers) {
            onWalletCreationStart = createPasskeyPrompt("create-wallet");
            onTransactionStart = createPasskeyPrompt("transaction");
        }

        return { onWalletCreationStart, onTransactionStart };
    }, [callbacks, createOnLogin?.signer.type, showPasskeyHelpers, createPasskeyPrompt]);

    const uiRenderProps: UIRenderProps = {
        emailSignerProps: {
            email,
            open: signerAuth.emailSignerDialogOpen && email != null,
            setOpen: signerAuth.setEmailSignerDialogOpen,
            step: signerAuth.emailSignerDialogStep,
            onSubmitOTP: signerAuth.emailsigners_handleOTPSubmit,
            onResendOTPCode: signerAuth.emailsigners_handleResendOTP,
            onSubmitEmail: signerAuth.emailsigners_handleSendEmailOTP,
            rejectRef: signerAuth.rejectRef,
            appearance,
        },
        phoneSignerProps: {
            phone: phoneNumber,
            open: signerAuth.phoneSignerDialogOpen && phoneNumber != null,
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
        <CrossmintWalletBaseProvider
            createOnLogin={createOnLogin}
            onAuthRequired={signerAuth.onAuthRequired}
            initializeWebView={initializeWebView}
            callbacks={getCallbacks()}
            clientTEEConnection={clientTEEConnection}
        >
            {children}
            {!headlessSigningFlow && renderUI != null && renderUI(uiRenderProps)}
        </CrossmintWalletBaseProvider>
    );
}
