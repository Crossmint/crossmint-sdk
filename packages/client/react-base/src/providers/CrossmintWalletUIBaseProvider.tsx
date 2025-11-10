import { type ReactNode, useCallback, useState, type MutableRefObject, useContext, useEffect } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import { CrossmintWalletBaseProvider } from "./CrossmintWalletBaseProvider";
import { useSignerAuth } from "@/hooks/useSignerAuth";
import type { CreateOnLogin } from "@/types";
import { CrossmintAuthBaseContext } from "./CrossmintAuthBaseProvider";

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
    const authContext = useContext(CrossmintAuthBaseContext);
    const [passkeyPromptState, setPasskeyPromptState] = useState<PasskeyPromptState>({ open: false });

    const signerAuth = useSignerAuth(createOnLogin);

    const email = createOnLogin?.signer.type === "email" ? createOnLogin?.signer.email : undefined;
    const phoneNumber = createOnLogin?.signer.type === "phone" ? createOnLogin?.signer.phone : undefined;

    // When using createOnLogin, we need to set the signer email from Crossmint Auth
    const [processedCreateOnLogin, setProcessedCreateOnLogin] = useState<CreateOnLogin | undefined>(undefined);
    useEffect(() => {
        const processCreateOnLogin = async () => {
            if (createOnLogin == null) {
                setProcessedCreateOnLogin(undefined);
                return;
            }

            if (authContext == null) {
                throw new Error("CrossmintWalletProvider with createOnLogin must be used within CrossmintAuthProvider");
            }

            if (createOnLogin.signer.type === "email") {
                // For email signers using createOnLogin, we must populate createOnLogin.signer.email with the email of the user
                // If not, processedCreateOnLogin will be undefined and the wallet will not be created.
                if (authContext.user == null) {
                    return;
                }
                if (authContext.user.email == null) {
                    await authContext.getUser();
                }
                const processed = {
                    ...createOnLogin,
                    signer: {
                        ...createOnLogin.signer,
                        email: authContext.user.email,
                    },
                };
                setProcessedCreateOnLogin(processed);
            } else if (createOnLogin.signer.type === "external-wallet") {
                if (authContext.experimental_externalWalletSigner == null) {
                    return;
                }
                const processed = {
                    ...createOnLogin,
                    signer: authContext.experimental_externalWalletSigner,
                };
                setProcessedCreateOnLogin(processed);
            } else {
                // For other signer types, we can use the createOnLogin as is
                setProcessedCreateOnLogin(createOnLogin);
            }
        };

        processCreateOnLogin().catch((error) => {
            console.error("Error processing createOnLogin:", error);
            throw error;
        });
    }, [createOnLogin, authContext]);

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
            createOnLogin={processedCreateOnLogin}
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
