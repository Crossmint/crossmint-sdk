import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthMaterialWithUser, OAuthProvider } from "@crossmint/common-sdk-auth";
import type { UIConfig } from "@crossmint/common-sdk-base";
import type { CrossmintAuthWalletConfig, LoginMethod } from "../CrossmintAuthProvider";
import { WagmiAuthProvider } from "./web3/WagmiAuthProvider";

type AuthStep = "initial" | "otp" | "qrCode" | "web3" | "web3/metamask" | "web3/walletconnect";

type OAuthUrlMap = Record<OAuthProvider, string>;
const initialOAuthUrlMap: OAuthUrlMap = {
    google: "",
    // Farcaster is not included here as it uses a different authentication method
};
interface AuthFormContextType {
    step: AuthStep;
    apiKey: string;
    baseUrl: string;
    fetchAuthMaterial: (refreshToken: string) => Promise<AuthMaterialWithUser>;
    appearance?: UIConfig;
    loginMethods: LoginMethod[];
    oauthUrlMap: OAuthUrlMap;
    isLoadingOauthUrlMap: boolean;
    setStep: (step: AuthStep) => void;
    setDialogOpen: (open: boolean) => void;
}

type ContextInitialStateProps = {
    apiKey: string;
    baseUrl: string;
    fetchAuthMaterial: (refreshToken: string) => Promise<AuthMaterialWithUser>;
    appearance?: UIConfig;
    loginMethods: LoginMethod[];
    setDialogOpen?: (open: boolean) => void;
    embeddedWallets: CrossmintAuthWalletConfig;
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
    const [oauthUrlMap, setOauthUrlMap] = useState<OAuthUrlMap>(initialOAuthUrlMap);
    const [isLoadingOauthUrlMap, setIsLoadingOauthUrlMap] = useState(true);

    const { loginMethods, apiKey, baseUrl, setDialogOpen, fetchAuthMaterial, appearance, embeddedWallets } =
        initialState;

    if (loginMethods.includes("web3") && embeddedWallets?.createOnLogin === "all-users") {
        throw new Error("Creating wallets on login is not yet supported for web3 login method");
    }

    useEffect(() => {
        const preFetchAndSetOauthUrl = async () => {
            setIsLoadingOauthUrlMap(true);
            try {
                const oauthProviders = loginMethods.filter(
                    (method): method is OAuthProvider => method in initialOAuthUrlMap
                );

                const oauthPromiseList = oauthProviders.map(async (provider) => {
                    const url = await getOAuthUrl(provider, { apiKey, baseUrl });
                    return { [provider]: url };
                });

                const oauthUrlMap = Object.assign({}, ...(await Promise.all(oauthPromiseList)));
                setOauthUrlMap(oauthUrlMap);
            } catch (error) {
                console.error("Error fetching OAuth URLs:", error);
            } finally {
                setIsLoadingOauthUrlMap(false);
            }
        };
        preFetchAndSetOauthUrl();
    }, [loginMethods, apiKey, baseUrl]);

    const handleToggleDialog = (open: boolean) => {
        setDialogOpen?.(open);
        if (!open) {
            // Delay to allow the close transition to complete before resetting the step
            setTimeout(() => setStep("initial"), 250);
        }
    };

    const value: AuthFormContextType = {
        step,
        apiKey,
        baseUrl,
        fetchAuthMaterial,
        appearance,
        loginMethods,
        oauthUrlMap,
        isLoadingOauthUrlMap,
        setDialogOpen: handleToggleDialog,
        setStep,
    };

    return (
        <AuthFormContext.Provider value={value}>
            <WagmiAuthProvider>{children}</WagmiAuthProvider>
        </AuthFormContext.Provider>
    );
};

async function getOAuthUrl(provider: OAuthProvider, options: { baseUrl: string; apiKey: string }) {
    try {
        const queryParams = new URLSearchParams({ apiKey: options.apiKey });
        const response = await fetch(
            `${options.baseUrl}api/2024-09-26/session/sdk/auth/social/${provider}/start?${queryParams}`,
            {
                headers: {
                    "x-api-key": options.apiKey,
                },
            }
        );

        if (!response.ok) {
            throw new Error("Failed to get OAuth URL. Please try again or contact support.");
        }

        const data = (await response.json()) as { oauthUrl: string };
        return data.oauthUrl;
    } catch (error) {
        console.error(`Error fetching OAuth URL for ${provider}:`, error);
        throw new Error(`Failed to get OAuth URL for ${provider}. Please try again or contact support.`);
    }
}
