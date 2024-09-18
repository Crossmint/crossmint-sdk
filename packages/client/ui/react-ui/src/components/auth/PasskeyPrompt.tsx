import FingerprintIcon from "@/icons/fingerprint";
import PasskeyIcon from "@/icons/passkey";
import PasskeyPromptLogo from "@/icons/passkeyPromptLogo";
import { Button, Dialog, Transition } from "@headlessui/react";
import React, { Fragment, ReactNode } from "react";

const dialogStyles: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflowY: "auto",
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
};

const overlayStyles: React.CSSProperties = {
    background: "rgba(139, 151, 151, 0.2)",
    backdropFilter: "blur(2px)",
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    transitionProperty: "opacity",
    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
    transitionDuration: "300ms",
    zIndex: -10,
};

const dialogContentStyles: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "white",
    width: "100%",
    maxWidth: "28rem",
    borderRadius: "16px",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    zIndex: 30,
};

const primaryButtonStyles: React.CSSProperties = {
    padding: "0.875rem",
    width: "100%",
    backgroundColor: "#04AA6D",
    color: "white",
    borderRadius: "8px",
    fontWeight: "bold",
};

const secondaryButtonStyles: React.CSSProperties = {
    padding: "0.875rem",
    width: "100%",
    backgroundColor: "#F0F2F4",
    color: "#00150D",
    borderRadius: "8px",
    fontWeight: "bold",
};

function PasskeyPromptCore({
    title,
    content,
    primaryButton,
    secondaryButton,
}: {
    title: string;
    content: ReactNode;
    primaryButton: ReactNode;
    secondaryButton?: ReactNode;
}) {
    return (
        // As of rn, onClose won't be used. All state will be handled in the WalletProvider
        <Dialog open onClose={() => {}} style={dialogStyles}>
            {/* This is a hacky workaround to have the foreground transparent styles to work. */}
            <Transition.Child
                as={Fragment}
                enter="ease-out duration-400"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-400"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
            >
                <div style={overlayStyles} />
            </Transition.Child>
            <div style={dialogContentStyles} onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: "3rem 2rem" }}>
                    <div style={{ display: "flex", justifyContent: "center", left: "0.75rem", position: "relative" }}>
                        <PasskeyPromptLogo />
                    </div>

                    <div style={{ display: "flex", justifyContent: "center" }}>
                        <p style={{ fontSize: "1.125rem", fontWeight: "bold", color: "#20343E" }}>{title}</p>
                    </div>

                    <div style={{ marginTop: "1.5rem", marginBottom: "2.25rem" }}>{content}</div>

                    <div style={{ display: "flex", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
                        {primaryButton}
                        {secondaryButton}
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

type PromptType = "create-wallet" | "transaction" | "not-supported" | "create-wallet-error" | "transaction-error";

export function PasskeyPrompt({
    state,
}: {
    state: {
        type: PromptType;
        primaryActionOnClick: () => void;
        secondaryActionOnClick?: () => void;
    };
}) {
    // These components are currently assembled based on the mockups.
    if (state.type === "create-wallet") {
        return (
            <PasskeyPromptCore
                title="Create Your Wallet"
                content={
                    <div style={{ fontWeight: "400", color: "#67797F" }}>
                        <div style={{ marginBottom: "1.125rem" }}>You're about to create a wallet.</div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <div>
                                    <PasskeyIcon />
                                </div>
                                Your wallet will be secured with a passkey
                            </div>

                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <div>
                                    <FingerprintIcon />
                                </div>
                                Your device will ask you for your fingerprint, face, or screen lock to set it up
                            </div>
                        </div>
                    </div>
                }
                primaryButton={
                    <Button style={primaryButtonStyles} onClick={state.primaryActionOnClick}>
                        Create Wallet
                    </Button>
                }
            />
        );
    }

    if (state.type === "create-wallet-error") {
        return (
            <PasskeyPromptCore
                title="Wallet Creation Failed"
                content={
                    <div style={{ fontWeight: "400", color: "#67797F" }}>
                        <div style={{ marginBottom: "1.5rem" }}>
                            We couldn't create your wallet. This could be due to rejecting the request, a timeout, or
                            not having access to your passkey on this device.
                        </div>
                    </div>
                }
                primaryButton={
                    <Button style={primaryButtonStyles} onClick={state.primaryActionOnClick}>
                        Try again
                    </Button>
                }
                secondaryButton={
                    <Button style={secondaryButtonStyles} onClick={state.secondaryActionOnClick}>
                        Troubleshoot
                    </Button>
                }
            />
        );
    }

    if (state.type === "transaction") {
        return (
            <PasskeyPromptCore
                title="First Time Using Your Wallet"
                content={
                    <div style={{ fontWeight: "400", color: "#67797F" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <div>
                                    <FingerprintIcon />
                                </div>
                                Your device will ask you for your fingerprint, face, or screen lock to authorize this
                                action.
                            </div>
                        </div>
                    </div>
                }
                primaryButton={
                    <Button style={primaryButtonStyles} onClick={state.primaryActionOnClick}>
                        Use Wallet
                    </Button>
                }
            />
        );
    }

    if (state.type === "transaction-error") {
        return (
            <PasskeyPromptCore
                title="Wallet Access Failed"
                content={
                    <div style={{ fontWeight: "400", color: "#67797F" }}>
                        <div style={{ marginBottom: "1.5rem" }}>
                            We couldn't access your wallet. This could be due to rejecting the request, a timeout, or
                            not having access to your passkey on this device.
                        </div>
                        <div>You last used your wallet on a [Device Name] with [Browser Name] on [Date/Time].</div>
                    </div>
                }
                primaryButton={
                    <Button style={primaryButtonStyles} onClick={state.primaryActionOnClick}>
                        Try again
                    </Button>
                }
                secondaryButton={
                    <Button style={secondaryButtonStyles} onClick={state.secondaryActionOnClick}>
                        Troubleshoot
                    </Button>
                }
            />
        );
    }

    if (state.type === "not-supported") {
        return (
            <PasskeyPromptCore
                title="Passkeys Not Supported on This Device"
                content={
                    <div style={{ fontWeight: "400", color: "#67797F" }}>
                        <div style={{ marginBottom: "1.125rem" }}>
                            To access your wallet with a passkey, switch to a device or browser that supports passkeys,
                            such as Chrome or Safari on a smartphone, tablet, or modern computer
                        </div>
                    </div>
                }
                primaryButton={
                    <Button style={primaryButtonStyles} onClick={state.primaryActionOnClick}>
                        Understood
                    </Button>
                }
            />
        );
    }

    return null;
}
