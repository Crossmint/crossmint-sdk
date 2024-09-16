import FingerprintIcon from "@/icons/fingerprint";
import PasskeyIcon from "@/icons/passkey";
import PasskeyPromptLogo from "@/icons/passkeyPromptLogo";
import { Button } from "@headlessui/react";
import React, { ReactNode } from "react";

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
        <div
            style={{
                backgroundColor: "white",
                maxWidth: "416px",
                width: "100%",
                borderRadius: "16px",
                padding: "48px 32px",
            }}
        >
            <div style={{ display: "flex", justifyContent: "center", left: "12px", position: "relative" }}>
                <PasskeyPromptLogo />
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
                <p style={{ fontSize: "18px", fontWeight: "bold", color: "#20343E" }}>{title}</p>
            </div>

            <div style={{ marginTop: "24px", marginBottom: "36px" }}>{content}</div>

            <div style={{ display: "flex", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
                {primaryButton}
                {secondaryButton}
            </div>
        </div>
    );
}

type PromptType = "create-wallet" | "transaction" | "error" | "not-supported";

export function PasskeyPrompt({ type }: { type: PromptType }) {
    // These components are currently assembled based on the mockups.
    if (type === "create-wallet") {
        return (
            <PasskeyPromptCore
                title="Create Your Wallet"
                content={
                    <div style={{ fontWeight: "400", color: "#67797F" }}>
                        <div style={{ marginBottom: "18px" }}>
                            You're about to create a wallet for{" "}
                            <span style={{ fontWeight: "bold" }}>[purpose: e.g., managing your digital assets]</span>.
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <div>
                                    <PasskeyIcon />
                                </div>
                                Your wallet will be secured with a passkey
                            </div>

                            <div style={{ display: "flex", gap: "8px" }}>
                                <div>
                                    <FingerprintIcon />
                                </div>
                                Your device will ask you for your fingerprint, face, or screen lock to set it up
                            </div>
                        </div>
                    </div>
                }
                primaryButton={
                    <Button
                        style={{
                            padding: "14px",
                            width: "100%",
                            backgroundColor: "#04AA6D",
                            color: "white",
                            borderRadius: "8px",
                            fontWeight: "bold",
                        }}
                    >
                        Create Wallet
                    </Button>
                }
            />
        );
    }

    if (type === "error") {
        return (
            <PasskeyPromptCore
                title="Wallet Access Failed"
                content={
                    <div style={{ fontWeight: "400", color: "#67797F" }}>
                        <div style={{ marginBottom: "24px" }}>
                            We couldn’t access your wallet. This could be due to rejecting the request, a timeout, or
                            not having access to your passkey on this device.
                        </div>
                        <div>You last used your wallet on a [Device Name] with [Browser Name] on [Date/Time].</div>
                    </div>
                }
                primaryButton={
                    <Button
                        style={{
                            padding: "14px",
                            width: "100%",
                            backgroundColor: "#04AA6D",
                            color: "white",
                            borderRadius: "8px",
                            fontWeight: "bold",
                        }}
                    >
                        Try again
                    </Button>
                }
                secondaryButton={
                    <Button
                        style={{
                            padding: "14px",
                            width: "100%",
                            backgroundColor: "#F0F2F4",
                            color: "#00150D",
                            borderRadius: "8px",
                            fontWeight: "bold",
                        }}
                    >
                        Troubleshoot
                    </Button>
                }
            />
        );
    }

    if (type === "transaction") {
        return (
            <PasskeyPromptCore
                title="First Time Using Your Wallet"
                content={
                    <div style={{ fontWeight: "400", color: "#67797F" }}>
                        <div style={{ marginBottom: "18px" }}>
                            You’ll need your wallet to{" "}
                            <span style={{ fontWeight: "bold" }}>[purpose: e.g., mint this NFT].</span>.
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <div>
                                    <FingerprintIcon />
                                </div>
                                Your device will ask you for your fingerprint, face, or screen lock to set it up
                            </div>
                        </div>
                    </div>
                }
                primaryButton={
                    <Button
                        style={{
                            padding: "14px",
                            width: "100%",
                            backgroundColor: "#04AA6D",
                            color: "white",
                            borderRadius: "8px",
                            fontWeight: "bold",
                        }}
                    >
                        Use Wallet
                    </Button>
                }
            />
        );
    }

    if (type === "not-supported") {
        return (
            <PasskeyPromptCore
                title="Passkeys Not Supported on This Device"
                content={
                    <div style={{ fontWeight: "400", color: "#67797F" }}>
                        <div style={{ marginBottom: "18px" }}>
                            To access your wallet with a passkey, switch to a device or browser that supports passkeys,
                            such as Chrome or Safari on a smartphone, tablet, or modern computer
                        </div>
                    </div>
                }
                primaryButton={
                    <Button
                        style={{
                            padding: "14px",
                            width: "100%",
                            backgroundColor: "#04AA6D",
                            color: "white",
                            borderRadius: "8px",
                            fontWeight: "bold",
                        }}
                    >
                        Understood
                    </Button>
                }
            />
        );
    }

    return null;
}
