import type { ReactNode } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { CrossmintWalletBaseProvider, type UIRenderProps, type CreateOnLogin } from "@crossmint/client-sdk-react-base";

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
    return (
        <CrossmintWalletBaseProvider
            createOnLogin={createOnLogin}
            appearance={appearance}
            showPasskeyHelpers={showPasskeyHelpers}
            callbacks={callbacks}
            renderUI={renderWebUI}
        >
            {children}
        </CrossmintWalletBaseProvider>
    );
}
