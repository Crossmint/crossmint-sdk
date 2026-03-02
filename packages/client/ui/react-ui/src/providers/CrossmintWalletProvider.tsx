import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
            createOnLogin={createOnLogin}
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
