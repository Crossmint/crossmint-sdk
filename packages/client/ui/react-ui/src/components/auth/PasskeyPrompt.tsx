import { Button, Dialog, Transition } from "@headlessui/react";
import type React from "react";
import { Fragment, type ReactNode } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";

import FingerprintIcon from "../../icons/fingerprint";
import PasskeyIcon from "../../icons/passkey";
import PasskeyPromptLogo from "../../icons/passkeyPromptLogo";
import { PoweredByCrossmint } from "../common/PoweredByCrossmint";
import { classNames } from "@/utils/classNames";

const primaryButtonStyles: React.CSSProperties = {
    padding: "0.875rem",
    width: "100%",
    backgroundColor: "#04AA6D",
    color: "white",
    borderRadius: "8px",
    fontWeight: "bold",
};

function PasskeyPromptCore({
    title,
    content,
    primaryButton,
    secondaryButton,
    appearance,
}: {
    title: string;
    content: ReactNode;
    primaryButton: ReactNode;
    secondaryButton?: ReactNode;
    appearance?: UIConfig;
}) {
    return (
        <Dialog
            open
            onClose={() => {}}
            className={classNames("fixed inset-0 z-20 flex items-center justify-center overflow-y-auto")}
        >
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
                <div
                    className={classNames(
                        "fixed inset-0 bg-[rgba(139,151,151,0.2)] backdrop-blur-[2px] transition-opacity duration-300 ease-in-out -z-10"
                    )}
                />
            </Transition.Child>
            <div
                className={classNames(
                    "flex flex-col items-center bg-white w-full max-w-[28rem] rounded-2xl shadow-sm z-30"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="pt-12 pb-10 px-8">
                    <div className="flex justify-center left-1.5 relative">
                        <PasskeyPromptLogo />
                    </div>

                    <div className="flex justify-center">
                        <p className="text-lg font-bold text-[#20343E]">{title}</p>
                    </div>

                    <div className="mt-4 mb-9">{content}</div>

                    <div className="flex flex-col gap-4 justify-center">
                        {primaryButton}
                        {secondaryButton}
                    </div>
                    <div className="flex justify-center pt-4">
                        <PoweredByCrossmint />
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

type PromptType = "create-wallet" | "transaction" | "not-supported" | "create-wallet-error" | "transaction-error";

export function PasskeyPrompt({
    state,
    appearance,
}: {
    state: {
        type: PromptType;
        primaryActionOnClick: () => void;
        secondaryActionOnClick?: () => void;
    };
    appearance?: UIConfig;
}) {
    // These components are currently assembled based on the mockups.
    if (state.type === "create-wallet") {
        return (
            <PasskeyPromptCore
                title="Create Your Wallet"
                appearance={appearance}
                content={
                    <div className="font-normal text-[#67797F]">
                        <div className="mb-4">You're about to create a wallet.</div>

                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <div>
                                    <PasskeyIcon />
                                </div>
                                Your wallet will be secured with a passkey
                            </div>

                            <div className="flex gap-2">
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
                appearance={appearance}
                content={
                    <div className="font-normal text-[#67797F]">
                        <div className="mb-6">
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
            />
        );
    }

    if (state.type === "transaction") {
        return (
            <PasskeyPromptCore
                title="First Time Using Your Wallet"
                appearance={appearance}
                content={
                    <div className="font-normal text-[#67797F]">
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <div>
                                    <FingerprintIcon />
                                </div>
                                <span>
                                    Your device will ask you for your fingerprint, face, or screen lock to authorize
                                    this action.
                                </span>
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
                appearance={appearance}
                content={
                    <div className="font-normal text-[#67797F]">
                        <div className="mb-6">
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
                    <a
                        href="https://docs.crossmint.com/wallets/smart-wallets/users/troubleshoot"
                        rel="noopener noreferrer"
                        target="_blank"
                        className="p-3.5 w-full text-center no-underline bg-[#F0F2F4] text-[#00150D] rounded-lg font-bold"
                    >
                        Troubleshoot
                    </a>
                }
            />
        );
    }

    if (state.type === "not-supported") {
        return (
            <PasskeyPromptCore
                title="Passkeys Not Supported on This Device"
                appearance={appearance}
                content={
                    <div className="font-normal text-[#67797F]">
                        <div className="mb-6">
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
