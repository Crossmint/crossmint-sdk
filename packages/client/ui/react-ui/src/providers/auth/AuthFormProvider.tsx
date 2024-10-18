import { createContext, useContext, useState, type ReactNode } from "react";
import type { OtpEmailPayload } from "@/types/auth";
import type { AuthMaterial } from "@crossmint/common-sdk-auth";
import type { UIConfig } from "@crossmint/common-sdk-base";
import type { LoginMethod } from "../CrossmintAuthProvider";

type AuthStep = "initial" | "walletMethod" | "otp" | "qrCode";

interface AuthFormContextType {
    step: AuthStep;
    email: string;
    apiKey: string;
    baseUrl: string;
    fetchAuthMaterial: (refreshToken: string) => Promise<AuthMaterial>;
    appearance?: UIConfig;
    loginMethods: LoginMethod[];
    otpEmailData: OtpEmailPayload | null;
    setStep: (step: AuthStep) => void;
    setEmail: (email: string) => void;
    setDialogOpen: (open: boolean) => void;
    setOtpEmailData: (data: OtpEmailPayload | null) => void;
    resetState: () => void;
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
    const [otpEmailData, setOtpEmailData] = useState<OtpEmailPayload | null>(null);
    const [step, setStep] = useState<AuthStep>("initial");
    const [email, setEmail] = useState("");

    const resetState = () => {
        setStep("initial");
        setEmail("");
    };

    const value: AuthFormContextType = {
        step,
        email,
        apiKey: initialState.apiKey,
        baseUrl: initialState.baseUrl,
        fetchAuthMaterial: initialState.fetchAuthMaterial,
        appearance: initialState.appearance,
        otpEmailData,
        loginMethods: initialState.loginMethods,
        setDialogOpen: initialState.setDialogOpen ?? (() => {}),
        setStep,
        setEmail,
        setOtpEmailData,
        resetState,
    };

    return <AuthFormContext.Provider value={value}>{children}</AuthFormContext.Provider>;
};
