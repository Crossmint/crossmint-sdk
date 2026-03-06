import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import {
    CrossmintWalletBaseProvider,
    type UIRenderProps,
    type CreateOnLogin,
    useCrossmint,
} from "@crossmint/client-sdk-react-base";
import { IframeDeviceSignerKeyStorage } from "@crossmint/wallets-sdk";

import { PasskeyPrompt } from "@/components/auth/PasskeyPrompt";
import { EmailSignersDialog } from "@/components/signers/EmailSignersDialog";
import { PhoneSignersDialog } from "@/components/signers/PhoneSignersDialog";
import { AuthContext } from "./CrossmintAuthProvider";

export interface CrossmintWalletProviderProps {
    /** Configuration for automatic wallet creation on login. */
    createOnLogin?: CreateOnLogin;
    /** Appearance configuration for wallet UI components. */
    appearance?: UIConfig;
    /** Whether to show passkey helper UI. Default: true. */
    showPasskeyHelpers?: boolean;
    /** Lifecycle callbacks for wallet creation and transaction events. */
    callbacks?: {
        onWalletCreationStart?: () => Promise<void>;
        onTransactionStart?: () => Promise<void>;
    };
    /** @internal */
    children: ReactNode;
}

function renderWebUI({ emailSignerProps, phoneSignerProps, passkeyPromptProps }: UIRenderProps) {
    return (
        <>
            <EmailSignersDialog {...emailSignerProps} />
            <PhoneSignersDialog {...phoneSignerProps} />
            {passkeyPromptProps != null && <PasskeyPrompt {...passkeyPromptProps} />}
        </>
    );
}

export function CrossmintWalletProvider({
    children,
    showPasskeyHelpers = true,
    appearance,
    createOnLogin,
    callbacks,
}: CrossmintWalletProviderProps) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");
    const authContext = useContext(AuthContext);

    // When using createOnLogin, we need to set the signer email/externalWalletSigner from Crossmint Auth
    const [processedCreateOnLogin, setProcessedCreateOnLogin] = useState<CreateOnLogin | undefined>(undefined);
    useEffect(() => {
        const processCreateOnLogin = async () => {
            if (createOnLogin == null) {
                setProcessedCreateOnLogin(undefined);
                return;
            }

            if (createOnLogin.signer.type === "email") {
                // For email signers using createOnLogin, we must populate createOnLogin.signer.email with the email of the user
                // If not, processedCreateOnLogin will be undefined and the wallet will not be created.
                if (authContext?.user == null) {
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
                setProcessedCreateOnLogin(processed as CreateOnLogin);
                return;
            }

            if (createOnLogin.signer.type === "external-wallet" && createOnLogin.signer.address == null) {
                // For external-wallet signers without an explicit address, use the auth context's externalWalletSigner
                if (authContext?.experimental_externalWalletSigner == null) {
                    return;
                }
                setProcessedCreateOnLogin({
                    ...createOnLogin,
                    signer: authContext.experimental_externalWalletSigner,
                } as CreateOnLogin);
                return;
            }

            // For other signer types (passkey, phone with explicit phone, etc.), pass through as-is
            setProcessedCreateOnLogin(createOnLogin);
        };

        processCreateOnLogin();
    }, [createOnLogin, authContext?.user, authContext?.user?.email, authContext?.experimental_externalWalletSigner]);

    const deviceSignerKeyStorage = useMemo(
        () => new IframeDeviceSignerKeyStorage(crossmint.apiKey),
        [crossmint.apiKey]
    );

    // ── Biometric prompt state ──────────────────────────────────────
    const [biometricPromptState, setBiometricPromptState] = useState<{
        open: boolean;
        type: "create-wallet" | "transaction";
        primaryActionOnClick?: () => void;
    }>({ open: false, type: "create-wallet" });

    const biometricRequestHandler = useCallback(
        (action: "createCredential" | "sign") =>
            new Promise<void>((resolve) => {
                setBiometricPromptState({
                    open: true,
                    type: action === "createCredential" ? "create-wallet" : "transaction",
                    primaryActionOnClick: () => {
                        setBiometricPromptState((prev) => ({ ...prev, open: false }));
                        resolve();
                    },
                });
            }),
        []
    );

    useEffect(() => {
        deviceSignerKeyStorage.setBiometricRequestHandler(biometricRequestHandler);
    }, [deviceSignerKeyStorage, biometricRequestHandler]);

    useEffect(() => {
        return () => deviceSignerKeyStorage.destroy();
    }, [deviceSignerKeyStorage]);

    return (
        <CrossmintWalletBaseProvider
            createOnLogin={processedCreateOnLogin}
            appearance={appearance}
            showPasskeyHelpers={showPasskeyHelpers}
            callbacks={callbacks}
            renderUI={renderWebUI}
            deviceSignerKeyStorage={deviceSignerKeyStorage}
        >
            {children}
            <PasskeyPrompt
                state={{
                    open: biometricPromptState.open,
                    type: biometricPromptState.type,
                    primaryActionOnClick: biometricPromptState.primaryActionOnClick,
                }}
                appearance={appearance}
            />
        </CrossmintWalletBaseProvider>
    );
}
