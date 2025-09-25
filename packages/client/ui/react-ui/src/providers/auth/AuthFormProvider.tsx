import { createContext, useContext, useState, type ReactNode } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import type { LoginMethod } from "@crossmint/client-sdk-react-base";
import type { BaseCrossmintAuthProviderProps } from "@/types/auth";

type AuthStep = "initial" | "otp" | "qrCode" | "web3" | "web3/metamask" | "web3/walletconnect";

interface AuthFormContextType {
    step: AuthStep;
    error: string | null;
    appearance?: UIConfig;
    termsOfServiceText?: string | ReactNode;
    authModalTitle?: string;
    loginMethods: LoginMethod[];
    defaultEmail?: string;
    baseUrl: string;
    setStep: (step: AuthStep) => void;
    setError: (error: string | null) => void;
    setDialogOpen: (open: boolean, successfulLogin?: boolean) => void;
}

type ContextInitialStateProps = {
    appearance?: UIConfig;
    loginMethods: LoginMethod[];
    termsOfServiceText?: string | ReactNode;
    authModalTitle?: string;
    createOnLogin?: BaseCrossmintAuthProviderProps;
    baseUrl: string;
    defaultEmail?: string;
};

type AuthFormProviderProps = {
    setDialogOpen?: (open: boolean, successfulLogin?: boolean) => void;
    initialState: ContextInitialStateProps;
    children: ReactNode;
};

const AuthFormContext = createContext<AuthFormContextType | undefined>(undefined);

export const useAuthForm = () => {
    const context = useContext(AuthFormContext);
    if (!context) {
        throw new Error("useAuthForm must be used within an AuthFormProvider");
    }
    return context;
};

export const AuthFormProvider = ({ setDialogOpen, initialState, children }: AuthFormProviderProps) => {
    const [step, setStep] = useState<AuthStep>("initial");
    const [error, setError] = useState<string | null>(null);

    const { loginMethods, baseUrl, appearance, termsOfServiceText, authModalTitle, defaultEmail } = initialState;

    const handleToggleDialog = (open: boolean, successfulLogin?: boolean) => {
        setDialogOpen?.(open, successfulLogin);
        if (!open) {
            // Delay to allow the close transition to complete before resetting the step
            setTimeout(() => setStep("initial"), 250);
        }
    };

    const value: AuthFormContextType = {
        step,
        error,
        baseUrl,
        appearance,
        termsOfServiceText,
        authModalTitle,
        loginMethods,
        defaultEmail,
        setDialogOpen: handleToggleDialog,
        setError,
        setStep,
    };

    return <AuthFormContext.Provider value={value}>{children}</AuthFormContext.Provider>;
};
