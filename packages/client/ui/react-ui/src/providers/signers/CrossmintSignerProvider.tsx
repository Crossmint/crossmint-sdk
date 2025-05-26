import {
    createContext,
    useContext,
    type ReactNode,
    useRef,
    useState,
    useEffect,
    useMemo,
    type Dispatch,
    type SetStateAction,
} from "react";
import type { SmartWalletTransactionParams } from "@crossmint/wallets-sdk/dist/solana/types/wallet"; /** @TODO: remove this once the type is exported from the SDK */
import { CrossmintWallets } from "@crossmint/wallets-sdk";
import type { ValidWalletState } from "@crossmint/client-sdk-react-base";
import { PublicKey, type VersionedTransaction } from "@solana/web3.js";
import base58 from "bs58";
import { environmentToCrossmintBaseURL, getEnvironmentForKey, type UIConfig } from "@crossmint/common-sdk-base";
import { useCrossmint } from "@/hooks";
import { deriveWalletErrorState } from "@/utils/errorUtils";
import { EmailSignersDialog } from "@/components/signers/EmailSignersDialog";
import { useSignerIFrameWindow } from "@/hooks/useSignerInvisibleIFrame";

const DEFAULT_EVENT_OPTIONS = {
    timeoutMs: 10_000,
    intervalMs: 5_000,
};

interface CrossmintSignerProviderProps {
    children: ReactNode;
    walletState: ValidWalletState;
    appearance?: UIConfig;
    setWalletState: Dispatch<SetStateAction<ValidWalletState>>;
    signersURL?: string;
}

type CrossmintSignerContext = {
    experimental_getOrCreateWalletWithRecoveryKey: (args: {
        type: "solana-smart-wallet";
        email: string;
    }) => Promise<void>;
};

export const CrossmintSignerContext = createContext<CrossmintSignerContext | null>(null);

export function CrossmintSignerProvider({
    children,
    setWalletState,
    appearance,
    signersURL,
}: CrossmintSignerProviderProps) {
    const {
        crossmint: { apiKey, jwt },
    } = useCrossmint();
    const smartWalletSDK = useMemo(() => CrossmintWallets.from({ apiKey, jwt }), [apiKey, jwt]);

    const environment = getEnvironmentForKey(apiKey);
    if (environment == null) {
        throw new Error("Could not determine environment from API key");
    }
    const iframeWindow = useSignerIFrameWindow(environment, signersURL);
    const [email, setEmail] = useState<string>("");
    const [step, setStep] = useState<"initial" | "otp">("initial");
    const [dialogOpen, setDialogOpen] = useState(false);
    const successHandlerRef = useRef<(() => void) | null>(null);
    const errorHandlerRef = useRef<((error: Error) => void) | null>(null);

    const experimental_getOrCreateWalletWithRecoveryKey = async (args: {
        type: "solana-smart-wallet";
        email: string;
    }) => {
        try {
            setWalletState({ status: "in-progress" });
            setEmail(args.email);

            const baseUrl = environmentToCrossmintBaseURL(
                apiKey.startsWith("ck_development_") ? "development" : "staging"
            );
            const response = await fetch(`${baseUrl}/api/v1/signers/get-public-key`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                    "x-api-key": apiKey,
                },
                body: JSON.stringify({
                    authId: `email:${args.email}`,
                    signingAlgorithm: "ed25519",
                }),
            });
            const responseData = await response.json();
            const publicKey = responseData.publicKey;
            if (publicKey == null) {
                throw new Error("No public key found");
            }
            if (publicKey.encoding !== "base58" || publicKey.keyType !== "ed25519" || publicKey.bytes == null) {
                throw new Error(
                    "Not supported. Expected public key to be in base58 encoding and ed25519 key type. Got: " +
                        JSON.stringify(publicKey)
                );
            }
            const adminSignerAddress = publicKey.bytes;
            const wallet = await getOrCreateSolanaWalletWithSigner(adminSignerAddress);

            const walletWithRecovery = {
                ...wallet,
                sendTransaction: async (props: SmartWalletTransactionParams) =>
                    new Promise<string>((resolve, reject) => {
                        const cleanup = () => {
                            setDialogOpen(false);
                            setStep("initial");
                        };
                        const successHandler = async () => {
                            cleanup();
                            try {
                                const txHash = await wallet.sendTransaction(props);
                                resolve(txHash);
                            } catch (error) {
                                reject(error);
                            }
                        };
                        const errorHandler = (error: Error) => {
                            cleanup();
                            reject(error);
                        };
                        successHandlerRef.current = successHandler;
                        errorHandlerRef.current = errorHandler;
                        handleGetRecoverySigner().then(successHandler).catch(errorHandler);
                    }),
            };

            setWalletState({
                status: "loaded",
                wallet: walletWithRecovery,
                type: "solana-smart-wallet",
            });
        } catch (error) {
            console.error("There was an error creating a wallet ", error);
            setWalletState(deriveWalletErrorState(error));
            throw error;
        }
    };

    async function handleGetRecoverySigner() {
        if (!iframeWindow.current || jwt == null) {
            throw new Error("[handleGetRecoverySigner] IFrame window not initialized or JWT not set");
        }
        return new Promise<void>(async (resolve, reject) => {
            try {
                const signerResponse = await iframeWindow.current?.sendAction({
                    event: "request:get-status",
                    responseEvent: "response:get-status",
                    data: {
                        authData: {
                            jwt,
                            apiKey,
                        },
                    },
                });

                if (signerResponse?.status !== "success") {
                    throw new Error(signerResponse?.error);
                }

                if (signerResponse.signerStatus === "ready") {
                    console.log("Signer already exists, skipping OTP flow");
                    return resolve();
                }

                // Store the resolve/reject functions to be called after OTP completion
                successHandlerRef.current = () => resolve();
                errorHandlerRef.current = (error) => reject(error);

                // Show the initial email confirmation flow dialog
                setStep("initial");
                setDialogOpen(true);
            } catch (err) {
                console.error("Error getting recovery signer", err);
                reject(err);
            }
        });
    }

    const handleSendEmailOTP = async (email: string) => {
        if (!iframeWindow.current || jwt == null) {
            throw new Error("[handleSendEmailOTP] IFrame window not initialized or JWT not set");
        }
        try {
            console.log("Creating Recovery Key");
            const res = await iframeWindow.current?.sendAction({
                event: "request:start-onboarding",
                responseEvent: "response:start-onboarding",
                data: {
                    authData: {
                        jwt,
                        apiKey,
                    },
                    data: {
                        keyType: "ed25519",
                        authId: `email:${email}`,
                    },
                },
            });

            if (res.status === "error") {
                throw new Error(res.error);
            }

            // If the signer already exists, skip OTP flow and continue BAU
            if (res.status === "success" && res.publicKey != null) {
                console.log("Signer already exists, skipping OTP flow");
                setStep("initial");
                setDialogOpen(false);
                return;
            }

            // proceed to OTP flow
            console.log("Proceeding to OTP flow");
            setStep("otp");
            setDialogOpen(true);
        } catch (error) {
            console.error("Error in email submission:", error);
            errorHandlerRef.current?.(error as Error);
            throw error;
        }
    };

    const handleOTPSubmit = async (token: string) => {
        if (!iframeWindow.current || jwt == null) {
            throw new Error("[handleOTPSubmit] IFrame window not initialized or JWT not set");
        }
        try {
            const res = await iframeWindow.current.sendAction({
                event: "request:complete-onboarding",
                responseEvent: "response:complete-onboarding",
                data: {
                    authData: {
                        jwt,
                        apiKey,
                    },
                    data: {
                        onboardingAuthentication: {
                            encryptedOtp: token,
                        },
                        keyType: "ed25519",
                    },
                },
            });

            if (res.status === "error") {
                throw new Error(res.error);
            }

            setStep("initial");
            setDialogOpen(false);

            // Resolve the promise when the flow is complete
            successHandlerRef.current?.();
        } catch (error) {
            console.error("Error completing onboarding:", error);
            errorHandlerRef.current?.(error as Error);
            throw error;
        }
    };

    async function getOrCreateSolanaWalletWithSigner(publicSignerAddress: string) {
        if (jwt == null) {
            throw new Error("[getOrCreateSolanaWalletWithSigner] JWT not set!");
        }
        try {
            return await smartWalletSDK.getOrCreateWallet("solana-smart-wallet", {
                adminSigner: {
                    type: "solana-keypair",
                    address: publicSignerAddress,
                    signer: {
                        signMessage: (message: Uint8Array) => {
                            return signWithRecovery(async () => {
                                if (iframeWindow.current == null) {
                                    throw new Error("IFrame window not initialized");
                                }
                                const res = await iframeWindow.current.sendAction({
                                    event: "request:sign",
                                    responseEvent: "response:sign",
                                    data: {
                                        authData: {
                                            jwt,
                                            apiKey,
                                        },
                                        data: {
                                            keyType: "ed25519",
                                            bytes: base58.encode(message),
                                            encoding: "base58",
                                        },
                                    },
                                    options: DEFAULT_EVENT_OPTIONS,
                                });
                                if (res.status === "error") {
                                    const err = new Error(res.error);
                                    (err as any).code = res.code;
                                    throw err;
                                }
                                if (res.signature == null) {
                                    throw new Error("Failed to sign message");
                                }
                                if (res.signature.encoding !== "base58") {
                                    throw new Error("Unsupported signature encoding: " + res.signature.encoding);
                                }
                                return base58.decode(res.signature.bytes);
                            });
                        },
                        signTransaction: (transaction: VersionedTransaction) => {
                            return signWithRecovery(async () => {
                                const messageData = transaction.message.serialize();
                                const res = await iframeWindow.current?.sendAction({
                                    event: "request:sign",
                                    responseEvent: "response:sign",
                                    data: {
                                        authData: {
                                            jwt,
                                            apiKey,
                                        },
                                        data: {
                                            keyType: "ed25519",
                                            bytes: base58.encode(messageData),
                                            encoding: "base58",
                                        },
                                    },
                                    options: DEFAULT_EVENT_OPTIONS,
                                });
                                if (res?.status === "error") {
                                    const err = new Error(res.error);
                                    (err as any).code = res.code;
                                    throw err;
                                }
                                if (res?.signature == null) {
                                    throw new Error("Failed to sign transaction");
                                }
                                if (res.signature.encoding !== "base58") {
                                    throw new Error("Unsupported signature encoding: " + res.signature.encoding);
                                }
                                transaction.addSignature(
                                    new PublicKey(publicSignerAddress),
                                    base58.decode(res.signature.bytes)
                                );
                                return transaction;
                            });
                        },
                    },
                },
            });
        } catch (error) {
            console.error("Error creating wallet with signer:", error);
            setWalletState(deriveWalletErrorState(error));
            throw error;
        }
    }

    // Helper to wrap signing with OTP recovery
    async function signWithRecovery<T>(signFn: () => Promise<T>): Promise<T> {
        try {
            return await signFn();
        } catch (error: any) {
            if (error.code === "invalid-device-share") {
                await handleGetRecoverySigner();
                return await signFn();
            }
            throw error;
        }
    }

    useEffect(() => {
        document.body.style.overflow = dialogOpen ? "hidden" : "";
    }, [dialogOpen]);

    return (
        <CrossmintSignerContext.Provider value={{ experimental_getOrCreateWalletWithRecoveryKey }}>
            <EmailSignersDialog
                email={email}
                open={dialogOpen}
                setOpen={setDialogOpen}
                step={step}
                onSubmitOTP={handleOTPSubmit}
                onResendOTPCode={handleSendEmailOTP}
                onSubmitEmail={handleSendEmailOTP}
                appearance={appearance}
            />
            {children}
        </CrossmintSignerContext.Provider>
    );
}

export function useCrossmintSigner({ enabled = true }: { enabled?: boolean } = {}) {
    const context = useContext(CrossmintSignerContext);
    if (!enabled) {
        return {
            experimental_getOrCreateWalletWithRecoveryKey: async () => {
                await Promise.reject(
                    new Error("useCrossmintSigner is disabled, please set 'experimental_enableRecoveryKeys' to true")
                );
            },
        };
    }
    if (context === null) {
        throw new Error("useCrossmintSigner must be used within a CrossmintSignerProvider");
    }
    return context;
}
