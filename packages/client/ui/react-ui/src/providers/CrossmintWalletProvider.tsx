import { useEffect, useMemo, type ReactNode } from "react";
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
    /** When true (default), built-in OTP signer UI prompts are shown during signing flows. When false, signing flows must be handled manually via the useWalletOtpSigner hook. Default: true. */
    showOtpSignerPrompt?: boolean;
    /** @internal */
    children: ReactNode;
}

function createRenderWebUI(showOtpSignerPrompt: boolean) {
    return ({ emailSignerProps, phoneSignerProps, passkeyPromptProps }: UIRenderProps) => (
        <>
            {showOtpSignerPrompt && <EmailSignersDialog {...emailSignerProps} />}
            {showOtpSignerPrompt && <PhoneSignersDialog {...phoneSignerProps} />}
            {passkeyPromptProps != null && <PasskeyPrompt {...passkeyPromptProps} />}
        </>
    );
}

export function CrossmintWalletProvider({
    children,
    showPasskeyHelpers = true,
    showOtpSignerPrompt = true,
    appearance,
    createOnLogin,
    callbacks,
}: CrossmintWalletProviderProps) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");

    const deviceSignerKeyStorage = useMemo(
        () => new IframeDeviceSignerKeyStorage(crossmint.apiKey),
        [crossmint.apiKey]
    );

    useEffect(() => {
        return () => deviceSignerKeyStorage.destroy();
    }, [deviceSignerKeyStorage]);

    const renderUI = useMemo(() => createRenderWebUI(showOtpSignerPrompt), [showOtpSignerPrompt]);

    return (
        <CrossmintWalletBaseProvider
            createOnLogin={createOnLogin}
            appearance={appearance}
            showPasskeyHelpers={showPasskeyHelpers}
            showOtpSignerPrompt={showOtpSignerPrompt}
            callbacks={callbacks}
            renderUI={renderUI}
            deviceSignerKeyStorage={deviceSignerKeyStorage}
        >
            {children}
        </CrossmintWalletBaseProvider>
    );
}
