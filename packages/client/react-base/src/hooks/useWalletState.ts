import { useState, useCallback, useRef, useEffect } from "react";
import type { Chain, CrossmintWallets, WalletArgsFor, EmailInternalSignerConfig } from "@crossmint/wallets-sdk";
import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";

import { deriveErrorState, type ValidWalletState } from "@/providers";

// Default no-op functions that throw errors when called
export const throwNotAvailable = (functionName: string) => () => {
    throw new Error(`${functionName} is not available. Make sure you're using an email signer wallet.`);
};

export function useWalletState({
    crossmintWallets,
    crossmintJwt,
    getHandshakeParent,
}: {
    crossmintWallets: CrossmintWallets;
    crossmintJwt: string | null;
    getHandshakeParent?: () => HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
}) {
    const [state, setState] = useState<ValidWalletState>({
        status: "not-loaded",
    });
    // Track whether email signer needs authentication
    const [needsAuthState, setNeedsAuthState] = useState<boolean>(false);

    const statusRef = useRef<ValidWalletState["status"]>(state.status);
    useEffect(() => {
        statusRef.current = state.status;
    }, [state.status]);

    const needsAuthRef = useRef<boolean>(false);
    const sendEmailWithOtpRef = useRef<(email: string) => Promise<void>>(throwNotAvailable("sendEmailWithOtp"));
    const verifyOtpRef = useRef<(otp: string) => Promise<void>>(throwNotAvailable("verifyOtp"));
    const rejectRef = useRef<(error: Error) => void>(throwNotAvailable("reject"));

    const getOrCreateWallet = useCallback(
        async <C extends Chain>(props: WalletArgsFor<C>) => {
            if (statusRef.current === "in-progress") {
                return {
                    startedCreation: false,
                    reason: "Wallet is already loading.",
                };
            }

            if (crossmintJwt == null) {
                return {
                    startedCreation: false,
                    reason: `Jwt not set in "CrossmintProvider".`,
                };
            }

            try {
                setState({ status: "in-progress" });

                if (props.signer?.type === "email") {
                    console.log("[useWalletState] setting onAuthRequired");
                    const emailSigner = props.signer as EmailInternalSignerConfig;
                    // biome-ignore lint/suspicious/useAwait: fix type later
                    emailSigner.onAuthRequired = async (needsAuth, sendEmailWithOtp, verifyOtp, reject) => {
                        console.log("[useWalletState] onAuthRequired", needsAuth);
                        needsAuthRef.current = needsAuth;
                        setNeedsAuthState(needsAuth);
                        sendEmailWithOtpRef.current = sendEmailWithOtp;
                        verifyOtpRef.current = verifyOtp;
                        rejectRef.current = reject;
                    };

                    // Set the handshake parent for the email signer
                    emailSigner._handshakeParent = getHandshakeParent?.();
                } else {
                    // Reset to default functions if not using email signer
                    needsAuthRef.current = false;
                    setNeedsAuthState(false);
                    sendEmailWithOtpRef.current = throwNotAvailable("sendEmailWithOtp");
                    verifyOtpRef.current = throwNotAvailable("verifyOtp");
                    rejectRef.current = throwNotAvailable("reject");
                }

                const wallet = await crossmintWallets.getOrCreateWallet(props);
                setState({ status: "loaded", wallet });
            } catch (error: unknown) {
                console.error("There was an error creating a wallet ", error);
                setState(deriveErrorState(error));
            }
            return { startedCreation: true };
        },
        [crossmintJwt, crossmintWallets, getHandshakeParent]
    );

    const clearWallet = useCallback(() => {
        setState({ status: "not-loaded" });
        needsAuthRef.current = false;
        setNeedsAuthState(false);
        sendEmailWithOtpRef.current = throwNotAvailable("sendEmailWithOtp");
        verifyOtpRef.current = throwNotAvailable("verifyOtp");
        rejectRef.current = throwNotAvailable("reject");
    }, []);

    return {
        state,
        setState,
        getOrCreateWallet,
        clearWallet,
        // Email signer functions
        needsAuth: needsAuthState,
        sendEmailWithOtp: sendEmailWithOtpRef.current,
        verifyOtp: verifyOtpRef.current,
        reject: rejectRef.current,
    };
}
