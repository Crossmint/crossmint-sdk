import { useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

    // When using createOnLogin, we need to set the signer email from Crossmint Auth
    const [processedCreateOnLogin, setProcessedCreateOnLogin] = useState<CreateOnLogin | undefined>(undefined);
    useEffect(() => {
        const processCreateOnLogin = () => {
            if (createOnLogin == null) {
                setProcessedCreateOnLogin(undefined);
                return;
            }

            const signer = createOnLogin.signer;
            if (signer?.type === "email") {
                // For email signers using createOnLogin, we must populate createOnLogin.signer.email with the email of the user.
                // If not, processedCreateOnLogin will be undefined and the wallet will not be created.
                if (authContext?.user == null) {
                    return;
                }
                if (authContext.user.email == null) {
                    // Trigger a user fetch; when authContext.user.email updates,
                    // this effect will re-run via the dependency array.
                    authContext.getUser();
                    return;
                }
                setProcessedCreateOnLogin({
                    ...createOnLogin,
                    signer: {
                        ...signer,
                        email: authContext.user.email,
                    },
                } as CreateOnLogin);
                return;
            }

            // For other signer types (passkey, phone with explicit phone, external-wallet with explicit address, etc.), pass through as-is
            setProcessedCreateOnLogin(createOnLogin);
        };

        processCreateOnLogin();
    }, [createOnLogin, authContext?.user, authContext?.user?.email]);

    const deviceSignerKeyStorage = useMemo(
        () => new IframeDeviceSignerKeyStorage(crossmint.apiKey),
        [crossmint.apiKey]
    );

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
        </CrossmintWalletBaseProvider>
    );
}
