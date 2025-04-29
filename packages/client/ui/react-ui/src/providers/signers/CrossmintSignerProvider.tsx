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
    experimental_getOrCreateWalletWithRecoveryKey: (args: {
        type: "solana-smart-wallet";
        email: string;
    }) => Promise<void>;
};

export const CrossmintSignerContext = createContext<CrossmintSignerContext | null>(null);

export function CrossmintSignerProvider({ children, setWalletState, appearance }: CrossmintSignerProviderProps) {
    const {
        crossmint: { apiKey, jwt },
    } = useCrossmint();
    const smartWalletSDK = useMemo(() => CrossmintWallets.from({ apiKey, jwt }), [apiKey, jwt]);

    const iframeWindow = useSignerIFrameWindow();
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

            const response = await fetch(
                "https://staging.crossmint.com/api/unstable/wallets/ncs/doesnt-matter/public-key",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${jwt}`,
                        "x-api-key": apiKey,
                        credentials: "omit",
                    },
                    body: JSON.stringify({
                        authId: `email:${args.email}`,
                        signingAlgorithm: "EDDSA_ED25519",
                    }),
                }
            );
            const responseData = await response.json();
            // Decode the base64 public key to Uint8Array then encode to base58
            const base64PublicKey = responseData.publicKey;
            const binaryData = Buffer.from(base64PublicKey, "base64");
            const adminSignerAddress = base58.encode(binaryData);
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
                        handleGetRecoverySigner(args.email).then(successHandler).catch(errorHandler);
                    }),
            };

            setWalletState({ status: "loaded", wallet: walletWithRecovery, type: "solana-smart-wallet" });
        } catch (error) {
            console.error("There was an error creating a wallet ", error);
            setWalletState(deriveWalletErrorState(error));
            throw error;
        }
    };

    async function handleGetRecoverySigner(email?: string) {
        if (!iframeWindow.current || jwt == null) {
            throw new Error("[handleGetRecoverySigner] IFrame window not initialized or JWT not set");
        }
        return new Promise<void>(async (resolve, reject) => {
            try {
                // Attempt to get the signer's public key
                const signerResponse = await iframeWindow.current?.sendAction({
                    event: "request:get-public-key",
                    responseEvent: "response:get-public-key",
                    data: {
                        authData: {
                            jwt,
                            apiKey,
                        },
                        data: {
                            chainLayer: "solana",
                        },
                    },
                });
                if (signerResponse?.status === "success") {
                    // signer exists, skip OTP flow
                    console.log("Signer already exists, skipping OTP flow");
                    return resolve();
                }
                // Store the resolve/reject functions to be called after OTP completion
                successHandlerRef.current = () => resolve();
                errorHandlerRef.current = (error) => reject(error);

                if (email != null) {
                    // signer doesn't exist yet, handle email submission
                    await handleSendEmailOTP(email);
                } else {
                    // if no email was provided, initiate the OTP flow from the start
                    setStep("initial");
                    setDialogOpen(true);
                }
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

            // If the signer already exists, skip OTP flow and continue BAU
            if (res.status === "success" && res.address != null) {
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
            return await smartWalletSDK.getOrCreateWallet("solana-smart-wallet", {
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
                email={email}
                setEmail={setEmail}
                open={dialogOpen}
                setOpen={setDialogOpen}
                step={step}
                setStep={setStep}
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
