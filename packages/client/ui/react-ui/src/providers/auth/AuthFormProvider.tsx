import { createContext, useContext, useState, type ReactNode } from "react";
import type { OAuthProvider, OtpEmailPayload } from "@/types/auth";
import type { AuthMaterial } from "@crossmint/common-sdk-auth";
import type { UIConfig } from "@crossmint/common-sdk-base";

type AuthMethod = "email" | OAuthProvider;

interface AuthFormContextType {
    authMethod: AuthMethod | null;
    step: "initial" | "otp" | "qrCode";
    email: string;
    apiKey: string;
    baseUrl: string;
    fetchAuthMaterial: (refreshToken: string) => Promise<AuthMaterial>;
    appearance?: UIConfig;
    otpEmailData: OtpEmailPayload | null;
    setAuthMethod: (method: AuthMethod) => void;
    setStep: (step: "initial" | "otp" | "qrCode") => void;
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
    const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
    const [step, setStep] = useState<"initial" | "otp" | "qrCode">("initial");
    const [email, setEmail] = useState("");

    const resetState = () => {
        setAuthMethod(null);
        setStep("initial");
        setEmail("");
    };

    const value: AuthFormContextType = {
        authMethod,
        step,
        email,
        apiKey: initialState.apiKey,
        baseUrl: initialState.baseUrl,
        fetchAuthMaterial: initialState.fetchAuthMaterial,
        appearance: initialState.appearance,
        otpEmailData,
        setDialogOpen: initialState.setDialogOpen ?? (() => {}),
        setAuthMethod,
        setStep,
        setEmail,
        setOtpEmailData,
        resetState,
    };

    return <AuthFormContext.Provider value={value}>{children}</AuthFormContext.Provider>;
};
