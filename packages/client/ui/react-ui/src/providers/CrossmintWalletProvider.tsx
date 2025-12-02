import { useMemo } from "react";
import type { ReactNode } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import {
    CrossmintWalletUIBaseProvider,
    type UIRenderProps,
    type CreateOnLogin,
    useCrossmint,
} from "@crossmint/client-sdk-react-base";

import { PasskeyPrompt } from "@/components/auth/PasskeyPrompt";
import { EmailSignersDialog } from "@/components/signers/EmailSignersDialog";
import { PhoneSignersDialog } from "@/components/signers/PhoneSignersDialog";
import { initReactUILogger } from "../logger/init";
import { LoggerContext } from "./LoggerProvider";

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
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");

    const logger = useMemo(() => {
        return initReactUILogger(crossmint.apiKey);
    }, [crossmint.apiKey]);

    return (
        <LoggerContext.Provider value={logger}>
            <CrossmintWalletUIBaseProvider
                createOnLogin={createOnLogin}
                appearance={appearance}
                showPasskeyHelpers={showPasskeyHelpers}
                callbacks={callbacks}
                renderUI={renderWebUI}
            >
                {children}
            </CrossmintWalletUIBaseProvider>
        </LoggerContext.Provider>
    );
}
