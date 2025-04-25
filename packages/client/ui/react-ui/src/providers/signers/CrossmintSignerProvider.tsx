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
import { CrossmintWallets } from "@crossmint/wallets-sdk";
import type { ValidWalletState } from "@crossmint/client-sdk-react-base";
import { PublicKey, type VersionedTransaction } from "@solana/web3.js";
import base58 from "bs58";
import type { UIConfig } from "@crossmint/common-sdk-base";
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
}

type CrossmintSignerContext = {
    experimental_getOrCreateWalletWithRecoveryKey: (args: { type: "solana" }) => Promise<void>;
};

export const CrossmintSignerContext = createContext<CrossmintSignerContext | null>(null);

export function CrossmintSignerProvider({ children, setWalletState, appearance }: CrossmintSignerProviderProps) {
    const {
        crossmint: { apiKey, jwt },
    } = useCrossmint();
    const smartWalletSDK = useMemo(() => CrossmintWallets.from({ apiKey, jwt }), [apiKey, jwt]);

    const [step, setStep] = useState<"initial" | "otp">("initial");
    const [dialogOpen, setDialogOpen] = useState(false);
    const iframeWindow = useSignerIFrameWindow();
    const successHandlerRef = useRef<(() => void) | null>(null);
    const errorHandlerRef = useRef<((error: Error) => void) | null>(null);

    const experimental_getOrCreateWalletWithRecoveryKey = async (args: { type: "solana" }) => {
        if (args.type !== "solana") {
            throw new Error("Unsupported wallet type, only solana is supported at the moment");
        }
        if (!iframeWindow.current) {
            throw new Error("IFrame window not initialized");
        }

        try {
            setWalletState({ status: "in-progress" });
            // Create a promise that resolves when the flow is complete
            return new Promise<void>((resolve, reject) => {
                setDialogOpen(true);
                setStep("initial");

                const cleanup = () => {
                    setDialogOpen(false);
                    setStep("initial");
                };

                const successHandler = () => {
                    cleanup();
                    resolve();
                };

                const errorHandler = (error: Error) => {
                    cleanup();
                    reject(error);
                };

                successHandlerRef.current = successHandler;
                errorHandlerRef.current = errorHandler;
            });
        } catch (error) {
            console.error("There was an error creating a wallet ", error);
            setWalletState(deriveWalletErrorState(error));
            throw error;
        }
    };

    const handleOnGetOrCreateRecoveryKey = async (email: string) => {
        try {
            if (!iframeWindow.current) {
                throw new Error("IFrame window not initialized");
            }

            if (jwt == null) {
                throw new Error("JWT not set");
            }

            console.log("Creating Recovery Key");
            const res = await iframeWindow.current?.sendAction({
                event: "request:create-signer",
                responseEvent: "response:create-signer",
                data: {
                    authData: {
                        jwt,
                        apiKey,
                    },
                    data: {
                        chainLayer: "solana",
                        authId: `email:${email}`,
                    },
                },
            });

            if (res.status === "error") {
                throw new Error(res.error);
            }

            console.log("[handleOnGetOrCreateRecoveryKey] success for email: ", email);
            console.log({ existingRecoveryKeyForEmail: res });

            // If the signer already exists, proceed directly to wallet creation
            if (res.status === "success" && res.address != null) {
                await getOrCreateSolanaWalletWithSigner(res.address);
                setStep("initial");
                setDialogOpen(false);
                return true; // Return true to indicate we handled everything
            }
            return false; // Return false to indicate we need OTP flow
        } catch (err) {
            console.error("There was an error creating a recovery key ", err);
            throw err;
        }
    };

    const handleEmailSubmit = async (email: string) => {
        try {
            const hasExistingRecoveryKey = await handleOnGetOrCreateRecoveryKey(email);
            if (!hasExistingRecoveryKey) {
                setStep("otp");
            } else {
                // Resolve the promise when the flow is complete
                successHandlerRef.current?.();
            }
        } catch (error) {
            console.error("Error in email submission:", error);
            errorHandlerRef.current?.(error as Error);
            throw error;
        }
    };

    const handleOTPSubmit = async (token: string) => {
        if (!iframeWindow.current) {
            throw new Error("IFrame window not initialized");
        }
        if (jwt == null) {
            throw new Error("JWT not set");
        }
        try {
            const res = await iframeWindow.current.sendAction({
                event: "request:send-otp",
                responseEvent: "response:send-otp",
                data: {
                    authData: {
                        jwt,
                        apiKey,
                    },
                    data: {
                        encryptedOtp: token,
                        chainLayer: "solana",
                    },
                },
            });
            if (res.status === "error") {
                throw new Error(res.error);
            }

            await getOrCreateSolanaWalletWithSigner(res.address);
            setStep("initial");
            setDialogOpen(false);

            // Resolve the promise when the flow is complete
            successHandlerRef.current?.();
        } catch (error) {
            console.error("Error in OTP submission:", error);
            errorHandlerRef.current?.(error as Error);
            throw error;
        }
    };

    async function getOrCreateSolanaWalletWithSigner(publicSignerAddress: string) {
        if (jwt == null) {
            throw new Error("[getOrCreateSolanaWalletWithSigner] JWT not set!");
        }

        try {
            const wallet = await smartWalletSDK.getOrCreateWallet("solana-smart-wallet", {
                adminSigner: {
                    type: "solana-keypair",
                    address: publicSignerAddress,
                    signer: {
                        signMessage: async (message: Uint8Array) => {
                            if (iframeWindow.current == null) {
                                throw new Error("IFrame window not initialized");
                            }

                            const res = await iframeWindow.current.sendAction({
                                event: "request:sign-message",
                                responseEvent: "response:sign-message",
                                data: {
                                    authData: {
                                        jwt,
                                        apiKey,
                                    },
                                    data: {
                                        message: base58.encode(message),
                                        chainLayer: "solana",
                                        encoding: "base58",
                                    },
                                },
                                options: DEFAULT_EVENT_OPTIONS,
                            });
                            if (res.status === "error") {
                                throw new Error(res.error);
                            }
                            if (res.signature == null) {
                                throw new Error("Failed to sign message");
                            }
                            return base58.decode(res.signature);
                        },
                        signTransaction: async (transaction: VersionedTransaction) => {
                            console.log("Signing transaction...", transaction);
                            const res = await iframeWindow.current?.sendAction({
                                event: "request:sign-transaction",
                                responseEvent: "response:sign-transaction",
                                data: {
                                    authData: {
                                        jwt,
                                        apiKey,
                                    },
                                    data: {
                                        transaction: base58.encode(transaction.serialize()),
                                        chainLayer: "solana",
                                        encoding: "base58",
                                    },
                                },
                                options: DEFAULT_EVENT_OPTIONS,
                            });

                            if (res?.status === "error") {
                                throw new Error(res.error);
                            }
                            if (res?.signature == null) {
                                throw new Error("Failed to sign transaction");
                            }
                            transaction.addSignature(new PublicKey(publicSignerAddress), base58.decode(res.signature));
                            return transaction;
                        },
                    },
                },
            });
            setWalletState({ status: "loaded", wallet, type: "solana-smart-wallet" });
        } catch (error) {
            console.error("Error creating wallet with signer:", error);
            setWalletState(deriveWalletErrorState(error));
            throw error;
        }
    }

    useEffect(() => {
        document.body.style.overflow = dialogOpen ? "hidden" : "";
    }, [dialogOpen]);

    return (
        <CrossmintSignerContext.Provider value={{ experimental_getOrCreateWalletWithRecoveryKey }}>
            <EmailSignersDialog
                open={dialogOpen}
                setOpen={setDialogOpen}
                step={step}
                setStep={setStep}
                onSubmitOTP={handleOTPSubmit}
                onResendOTPCode={async (email: string) => {
                    await handleOnGetOrCreateRecoveryKey(email);
                    setStep("otp");
                }}
                onSubmitEmail={handleEmailSubmit}
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
