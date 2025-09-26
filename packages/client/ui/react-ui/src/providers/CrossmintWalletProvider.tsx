import type { ReactNode } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import {
    CrossmintWalletUIBaseProvider,
    type UIRenderProps,
    type CreateOnLogin,
} from "@crossmint/client-sdk-react-base";

import { PasskeyPrompt } from "@/components/auth/PasskeyPrompt";
import { EmailSignersDialog } from "@/components/signers/EmailSignersDialog";
import { PhoneSignersDialog } from "@/components/signers/PhoneSignersDialog";

export interface CrossmintWalletProviderProps {
    children: ReactNode;
    showPasskeyHelpers?: boolean;
    appearance?: UIConfig;
    createOnLogin?: CreateOnLogin;
    experimental_headlessSigningFlow?: boolean;
    callbacks?: {
        onWalletCreationStart?: () => Promise<void>;
        onTransactionStart?: () => Promise<void>;
    };
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
    experimental_headlessSigningFlow = false,
    callbacks,
}: CrossmintWalletProviderProps) {
    return (
        <CrossmintWalletUIBaseProvider
            createOnLogin={createOnLogin}
            appearance={appearance}
            experimental_headlessSigningFlow={experimental_headlessSigningFlow}
            showPasskeyHelpers={showPasskeyHelpers}
            callbacks={callbacks}
            renderUI={experimental_headlessSigningFlow ? undefined : renderWebUI}
        >
            {children}
        </CrossmintWalletUIBaseProvider>
    );
}
