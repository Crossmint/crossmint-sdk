"use client";

import AuthModal from "@/components/AuthModal";
import { CrossmintService } from "@/services/CrossmintService";
import { CrossmintEnvironment } from "@/utils";
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthContextType = {
    login: () => void;
    logout: () => void;
    jwt: string | null;
};

const AuthContext = createContext<AuthContextType>({
    login: () => {},
    logout: () => {},
    jwt: null,
});

type AuthProviderParams = {
    apiKey: string;
    environment: CrossmintEnvironment;
    children: ReactNode;
};

export function AuthProvider({ children, apiKey, environment }: AuthProviderParams) {
    const [jwtToken, setJwtToken] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const crossmintService = useMemo(
        () => new CrossmintService(apiKey, jwtToken, environment),
        [apiKey, jwtToken, environment]
    );

    useEffect(() => {
        const crossmintSession = document.cookie.split("; ").find((row) => row.startsWith("crossmint-session"));
        const crossmintSessionCookie = crossmintSession ? crossmintSession.split("=")[1] : null;
        if (crossmintSessionCookie) {
            setJwtToken(crossmintSessionCookie);
        }
    }, []);

    const login = () => {
        console.log("Setting modal open to true");
        setModalOpen(true);
        console.log("Done setting modal open to false");
    };

    useEffect(() => {
        if (jwtToken == null) {
            return;
        }

        setModalOpen(false);
    }, [modalOpen, jwtToken]);

    const logout = () => {
        document.cookie = "crossmint-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        setJwtToken(null);
    };

    useEffect(() => {
        if (jwtToken) {
            // TODO: WAL-2562: get user data from crossmint
            // setUser({
            //     id: "1",
            //     email: "test@test.com",
            //     name: "Test",
            // });

            document.cookie = `crossmint-session=${jwtToken}; path=/;`;
        }
    }, [jwtToken]);

    return (
        <AuthContext.Provider value={{ login, logout, jwt: jwtToken }}>
            {children}
            {modalOpen && (
                <AuthModal
                    baseUrl={crossmintService.crossmintBaseUrl}
                    setModalOpen={setModalOpen}
                    setJwtToken={setJwtToken}
                    apiKey={apiKey}
                />
            )}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
// "use client";

// import AuthModal from "@/components/AuthModal";
// import { CrossmintService } from "@/services/CrossmintService";
// import { CrossmintEnvironment } from "@/utils";
// import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";

// import { EVMSmartWallet, SmartWalletSDK } from "@crossmint/client-sdk-smart-wallet";

// type AuthContextType = {
//     login: () => void;
//     logout: () => void;
//     jwt: string | null;
//     smartWallet: EVMSmartWallet | null;
// };

// const AuthContext = createContext<AuthContextType>({
//     login: () => {},
//     logout: () => {},
//     jwt: null,
//     smartWallet: null,
// });

// type AuthProviderParams = {
//     apiKey: string;
//     environment: CrossmintEnvironment;
//     children: ReactNode;
// };

// export function AuthProvider({ children, apiKey, environment }: AuthProviderParams) {
//     console.log("apiKey");
//     console.log(apiKey);
//     console.log("env");
//     console.log(environment);

//     const [jwtToken, setJwtToken] = useState<string | null>(null);
//     const [smartWallet, setSmartWallet] = useState<EVMSmartWallet | null>(null);
//     const [modalOpen, setModalOpen] = useState(false);
//     const crossmintService = useMemo(
//         () => new CrossmintService(apiKey, jwtToken, environment),
//         [apiKey, jwtToken, environment]
//     );
//     const smartWalletSDK = useMemo(() => SmartWalletSDK.init({ clientApiKey: apiKey }), [apiKey, environment]);

//     useEffect(() => {
//         const crossmintSession = document.cookie.split("; ").find((row) => row.startsWith("crossmint-session"));
//         const crossmintSessionCookie = crossmintSession ? crossmintSession.split("=")[1] : null;
//         if (crossmintSessionCookie) {
//             setJwtToken(crossmintSessionCookie);
//         }
//     }, []);

//     const login = () => {
//         console.log("Is this being called");
//         setModalOpen(true);
//         console.log("Can you see me");
//     };

//     useEffect(() => {
//         if (jwtToken == null) {
//             return;
//         }
//         // setModalOpen(false);

//         // const grabWallet = async () => {
//         //     console.log("Grabbing or creating smart wallet for user");
//         //     const test = await smartWalletSDK.getOrCreateWallet({ jwt: jwtToken }, "polygon-amoy");
//         //     console.log("Done setting it in state");
//         //     console.log(`Wallet address is ${test.address}`);
//         //     setSmartWallet(test);
//         // };

//         // grabWallet();
//     }, [modalOpen, jwtToken]);

//     const logout = () => {
//         document.cookie = "crossmint-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
//         setJwtToken(null);
//     };

//     useEffect(() => {
//         if (jwtToken) {
//             // TODO: WAL-2562: get user data from crossmint
//             // setUser({
//             //     id: "1",
//             //     email: "test@test.com",
//             //     name: "Test",
//             // });

//             document.cookie = `crossmint-session=${jwtToken}; path=/;`;
//         }
//     }, [jwtToken]);

//     return (
//         <AuthContext.Provider value={{ login, logout, jwt: jwtToken, smartWallet }}>
//             {children}
//             {modalOpen && (
//                 <AuthModal
//                     baseUrl={crossmintService.crossmintBaseUrl}
//                     setModalOpen={setModalOpen}
//                     setJwtToken={setJwtToken}
//                     apiKey={apiKey}
//                 />
//             )}
//         </AuthContext.Provider>
//     );
// }

// export function useAuth() {
//     const context = useContext(AuthContext);
//     if (context === undefined) {
//         throw new Error("useAuth must be used within an AuthProvider");
//     }
//     return context;
// }
