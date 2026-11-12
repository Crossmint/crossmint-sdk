import { useEffect, useMemo, type ReactNode } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import {
    CrossmintWalletBaseProvider,
    type UIRenderProps,
    type CreateOnLogin,
    useCrossmint,
    useLogger,
} from "@crossmint/client-sdk-react-base";
import { LoggerContext } from "./CrossmintProvider";
import {
    type DeviceSignerBiometricOptions,
    IframeDeviceSignerKeyStorage,
    UnsupportedBrowserError,
} from "@crossmint/wallets-sdk";

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
    /**
     * Asks the user for a fingerprint, face or screen lock before the device signer signs.
     * Applies to device keys created from now on; existing keys keep their policy. Default: `{ biometricPolicy: "none" }`.
     * @example { biometricPolicy: "session", biometricExpirationTime: 300 }
     */
    deviceSigner?: DeviceSignerBiometricOptions;
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
    deviceSigner,
}: CrossmintWalletProviderProps) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");
    const logger = useLogger(LoggerContext);

    // biome-ignore lint/correctness/useExhaustiveDependencies: one storage per API key; a loaded wallet keeps this instance, so policy changes go through setBiometricOptions below
    const deviceSignerKeyStorage = useMemo(() => {
        try {
            return new IframeDeviceSignerKeyStorage(crossmint.apiKey, deviceSigner);
        } catch (error) {
            if (error instanceof UnsupportedBrowserError) {
                logger.error(`[Crossmint] ${error.message}`, { error });
                return undefined;
            }
            throw error;
        }
    }, [crossmint.apiKey]);

    const biometricPolicy = deviceSigner?.biometricPolicy;
    const biometricExpirationTime = deviceSigner?.biometricExpirationTime;
    // biome-ignore lint/correctness/useExhaustiveDependencies: depend on the policy values, not on every new `deviceSigner` object literal
    useEffect(() => {
        deviceSignerKeyStorage?.setBiometricOptions(deviceSigner ?? {});
    }, [deviceSignerKeyStorage, biometricPolicy, biometricExpirationTime]);

    useEffect(() => {
        return () => deviceSignerKeyStorage?.destroy();
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
