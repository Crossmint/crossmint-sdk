import { createContext, useContext, useState, type ReactNode } from "react";
import type { AuthMaterial } from "@crossmint/common-sdk-auth";
import type { UIConfig } from "@crossmint/common-sdk-base";
import type { LoginMethod } from "../CrossmintAuthProvider";

type AuthStep = "initial" | "walletMethod" | "otp" | "qrCode";

interface AuthFormContextType {
    step: AuthStep;
    apiKey: string;
    baseUrl: string;
    fetchAuthMaterial: (refreshToken: string) => Promise<AuthMaterial>;
    appearance?: UIConfig;
    loginMethods: LoginMethod[];
    setStep: (step: AuthStep) => void;
    setDialogOpen: (open: boolean) => void;
}

type ContextInitialStateProps = {
    apiKey: string;
    baseUrl: string;
    fetchAuthMaterial: (refreshToken: string) => Promise<AuthMaterial>;
    appearance?: UIConfig;
    loginMethods: LoginMethod[];
    setDialogOpen?: (open: boolean) => void;
};

const AuthFormContext = createContext<AuthFormContextType | undefined>(undefined);

export const useAuthForm = () => {
    const context = useContext(AuthFormContext);
    if (!context) {
        throw new Error("useAuthForm must be used within an AuthFormProvider");
    }
    return context;
};

export const AuthFormProvider = ({
    children,
    initialState,
}: { children: ReactNode; initialState: ContextInitialStateProps }) => {
    const [step, setStep] = useState<AuthStep>("initial");

    const value: AuthFormContextType = {
        step,
        apiKey: initialState.apiKey,
        baseUrl: initialState.baseUrl,
        fetchAuthMaterial: initialState.fetchAuthMaterial,
        appearance: initialState.appearance,
        loginMethods: initialState.loginMethods,
        setDialogOpen: initialState.setDialogOpen ?? (() => {}),
        setStep,
    };

    return <AuthFormContext.Provider value={value}>{children}</AuthFormContext.Provider>;
};
