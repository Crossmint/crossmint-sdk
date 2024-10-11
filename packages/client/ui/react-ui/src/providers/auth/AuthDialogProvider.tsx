import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { OAuthProvider, OtpEmailPayload } from "@/types/auth";
import type { AuthMaterial } from "@crossmint/common-sdk-auth";
import type { UIConfig } from "@crossmint/common-sdk-base";

type AuthMethod = "email" | OAuthProvider;

interface AuthDialogContextType {
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
    setDialogOpen: (open: boolean) => void;
};

const AuthDialogContext = createContext<AuthDialogContextType | undefined>(undefined);

export const useAuthDialog = () => {
    const context = useContext(AuthDialogContext);
    if (!context) {
        throw new Error("useAuthDialog must be used within an AuthDialogProvider");
    }
    return context;
};

export const AuthDialogProvider = ({
    children,
    initialState,
}: { children: ReactNode; initialState: ContextInitialStateProps }) => {
    const [apiKey, setApiKey] = useState("");
    const [baseUrl, setBaseUrl] = useState("");
    const [otpEmailData, setOtpEmailData] = useState<OtpEmailPayload | null>(null);
    const [appearance, setAppearance] = useState<UIConfig | undefined>(undefined);
    const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
    const [step, setStep] = useState<"initial" | "otp" | "qrCode">("initial");
    const [email, setEmail] = useState("");

    useEffect(() => {
        if (initialState?.apiKey != null) {
            setApiKey(initialState.apiKey);
        }
        if (initialState?.baseUrl != null) {
            setBaseUrl(initialState.baseUrl);
        }
        if (initialState?.appearance != null) {
            setAppearance(initialState.appearance);
        }
    }, [initialState]);

    const resetState = () => {
        setAuthMethod(null);
        setStep("initial");
        setEmail("");
    };

    const value: AuthDialogContextType = {
        authMethod,
        step,
        email,
        apiKey,
        baseUrl,
        fetchAuthMaterial: initialState.fetchAuthMaterial,
        appearance,
        otpEmailData,
        setDialogOpen: initialState.setDialogOpen,
        setAuthMethod,
        setStep,
        setEmail,
        setOtpEmailData,
        resetState,
    };

    return <AuthDialogContext.Provider value={value}>{children}</AuthDialogContext.Provider>;
};
