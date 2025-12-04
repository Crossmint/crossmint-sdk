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
    callbacks,
}: CrossmintWalletProviderProps) {
    return (
        <CrossmintWalletUIBaseProvider
            createOnLogin={createOnLogin}
            appearance={appearance}
            showPasskeyHelpers={showPasskeyHelpers}
            callbacks={callbacks}
            renderUI={renderWebUI}
        >
            {children}
        </CrossmintWalletUIBaseProvider>
    );
}
