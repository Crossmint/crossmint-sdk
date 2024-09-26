import { Button, Dialog, Transition } from "@headlessui/react";
import { type CSSProperties, Fragment, type ReactNode } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";

import FingerprintIcon from "../../icons/fingerprint";
import PasskeyIcon from "../../icons/passkey";
import PasskeyPromptLogo from "../../icons/passkeyPromptLogo";
import { PoweredByCrossmint } from "../common/PoweredByCrossmint";
import { classNames } from "@/utils/classNames";
import X from "../../icons/x";

type PasskeyPromptCoreProps = {
    title: string;
    content: ReactNode;
    primaryButton: ReactNode;
    secondaryAction?: ReactNode;
    appearance?: UIConfig;
    onClose?: () => void;
};
function PasskeyPromptCore({
    title,
    content,
    primaryButton,
    secondaryAction,
    appearance,
    onClose,
}: PasskeyPromptCoreProps) {
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
                    "flex flex-col items-center w-full max-w-[28rem] rounded-2xl shadow-sm z-30 border",
                    appearance?.colors?.background != null ? `bg-[${appearance.colors.background}]` : "bg-white",
                    appearance?.colors?.border != null ? `border-[${appearance.colors.border}]` : "border-[#D0D5DD]"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {onClose != null ? (
                    <div className="relative w-full">
                        <button
                            type="button"
                            aria-label="Close"
                            className={classNames(
                                "absolute right-6 top-6 w-6 cursor-pointer outline-offset-4 rounded-full",
                                appearance?.colors?.border ? `text-[${appearance.colors.border}]` : "text-[#909ca3]"
                            )}
                            onClick={onClose}
                        >
                            <X />
                        </button>
                    </div>
                ) : null}
                <div className="pt-12 pb-10 px-8">
                    <div className="flex justify-center left-1.5 relative">
                        <PasskeyPromptLogo appearance={appearance} />
                    </div>
                    <div className="flex justify-center">
                        <p
                            className={classNames(
                                "text-lg font-bold",
                                appearance?.colors?.textPrimary != null
                                    ? `text-[${appearance.colors.textPrimary}]`
                                    : "text-[#20343E]"
                            )}
                        >
                            {title}
                        </p>
                    </div>
                    <div className="mt-4 mb-9">
                        <div
                            className={classNames(
                                "font-normal",
                                appearance?.colors?.textSecondary != null
                                    ? `text-[${appearance.colors.textSecondary}]`
                                    : "text-[#67797F]"
                            )}
                        >
                            {content}
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 justify-center">
                        {primaryButton}
                        {secondaryAction}
                    </div>
                    <div className="flex justify-center pt-4">
                        <PoweredByCrossmint color={appearance?.colors?.textSecondary} />
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

type PromptType = "create-wallet" | "transaction" | "not-supported" | "create-wallet-error" | "transaction-error";

type PasskeyPromptProps = {
    state: {
        type: PromptType;
        primaryActionOnClick: () => void;
        secondaryActionOnClick?: () => void;
        onClose?: () => void;
    };
    appearance?: UIConfig;
};
export function PasskeyPrompt({ state, appearance }: PasskeyPromptProps) {
    // These components are currently assembled based on the mockups.
    switch (state.type) {
        case "create-wallet":
            return (
                <PasskeyPromptCore
                    title="Create Your Wallet"
                    appearance={appearance}
                    content={
                        <>
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
                        </>
                    }
                    primaryButton={
                        <Button style={primaryButtonStyles(appearance)} onClick={state.primaryActionOnClick}>
                            Create Wallet
                        </Button>
                    }
                    onClose={state.onClose}
                />
            );

        case "create-wallet-error":
            return (
                <PasskeyPromptCore
                    title="Wallet Creation Failed"
                    appearance={appearance}
                    content={
                        <div className="mb-6">
                            We couldn't create your wallet. This could be due to rejecting the request, a timeout, or
                            not having access to your passkey on this device.
                        </div>
                    }
                    primaryButton={
                        <Button style={primaryButtonStyles(appearance)} onClick={state.primaryActionOnClick}>
                            Try again
                        </Button>
                    }
                    onClose={state.onClose}
                />
            );

        case "transaction":
            return (
                <PasskeyPromptCore
                    title="First Time Using Your Wallet"
                    appearance={appearance}
                    content={
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
                    }
                    primaryButton={
                        <Button style={primaryButtonStyles(appearance)} onClick={state.primaryActionOnClick}>
                            Use Wallet
                        </Button>
                    }
                    onClose={state.onClose}
                />
            );

        case "transaction-error":
            return (
                <PasskeyPromptCore
                    title="Wallet Access Failed"
                    appearance={appearance}
                    content={
                        <div className="mb-6">
                            We couldn't access your wallet. This could be due to rejecting the request, a timeout, or
                            not having access to your passkey on this device.
                        </div>
                    }
                    primaryButton={
                        <Button style={primaryButtonStyles(appearance)} onClick={state.primaryActionOnClick}>
                            Try again
                        </Button>
                    }
                    secondaryAction={
                        <a
                            href="https://docs.crossmint.com/wallets/smart-wallets/users/troubleshoot"
                            rel="noopener noreferrer"
                            target="_blank"
                            className={classNames(
                                "p-3.5 w-full text-center no-underline rounded-lg font-bold",
                                appearance?.colors?.inputBackground != null
                                    ? `bg-[${appearance.colors.inputBackground}]`
                                    : "bg-[#F0F2F4]",
                                appearance?.colors?.textSecondary != null
                                    ? `text-[${appearance.colors.textSecondary}]`
                                    : "text-[#00150D]"
                            )}
                        >
                            Troubleshoot
                        </a>
                    }
                    onClose={state.onClose}
                />
            );

        case "not-supported":
            return (
                <PasskeyPromptCore
                    title="Passkeys Not Supported on This Device"
                    appearance={appearance}
                    content={
                        <div className="mb-6">
                            To access your wallet with a passkey, switch to a device or browser that supports passkeys,
                            such as Chrome or Safari on a smartphone, tablet, or modern computer
                        </div>
                    }
                    primaryButton={
                        <Button style={primaryButtonStyles(appearance)} onClick={state.primaryActionOnClick}>
                            Understood
                        </Button>
                    }
                    onClose={state.onClose}
                />
            );

        default:
            return null;
    }
}

const primaryButtonStyles = (appearance?: UIConfig): CSSProperties => ({
    padding: "0.875rem",
    width: "100%",
    backgroundColor: appearance?.colors?.buttonBackground ?? "#04AA6D",
    color: appearance?.colors?.textPrimary ?? "white",
    borderRadius: appearance?.borderRadius ?? "8px",
    borderColor: appearance?.colors?.border ?? "#04AA6D",
    borderWidth: "1px",
    fontWeight: "bold",
});
