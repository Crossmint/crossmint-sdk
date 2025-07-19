import type { ReactNode } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

import FingerprintIcon from "../../icons/fingerprint";
import PasskeyIcon from "../../icons/passkey";
import PasskeyPromptLogo from "../../icons/passkeyPromptLogo";
import { SecuredByCrossmint } from "../common/SecuredByCrossmint";
import { Dialog, DialogContent, DialogTitle } from "../common/Dialog";
import { classNames } from "@/utils/classNames";
import { tw } from "@/twind-instance";

type PasskeyPromptCoreProps = {
    title: string;
    content: ReactNode;
    primaryButton: ReactNode;
    secondaryAction?: ReactNode;
    appearance?: UIConfig;
};
function PasskeyPromptCore({ title, content, primaryButton, secondaryAction, appearance }: PasskeyPromptCoreProps) {
    return (
        <Dialog modal={false} open onOpenChange={() => {}}>
            <DialogContent
                showCloseButton={false}
                onInteractOutside={(e) => e.preventDefault()}
                onOpenAutoFocus={(e) => e.preventDefault()}
                className={tw("!p-0 !min-[480px]:p-0")}
                style={{
                    borderRadius: appearance?.borderRadius,
                    backgroundColor: appearance?.colors?.background,
                }}
            >
                <VisuallyHidden asChild>
                    <DialogTitle>{title}</DialogTitle>
                </VisuallyHidden>

                <div
                    className={tw(
                        "relative pt-10 pb-[30px] px-6 !min-[480px]:px-10 flex flex-col gap-[10px] antialiased animate-none"
                    )}
                >
                    <div className={tw("flex justify-center left-1.5 relative")}>
                        <PasskeyPromptLogo appearance={appearance} />
                    </div>
                    <div className={tw("flex justify-center")}>
                        <p
                            style={{
                                fontSize: "1.125rem",
                                lineHeight: "1.75rem",
                                fontWeight: "bold",
                                color: appearance?.colors?.textPrimary || "#20343E",
                            }}
                        >
                            {title}
                        </p>
                    </div>
                    <div className={tw("mb-6")}>
                        <div
                            style={{
                                fontWeight: "normal",
                                color: appearance?.colors?.textSecondary || "#67797F",
                            }}
                        >
                            {content}
                        </div>
                    </div>
                    <div className={tw("flex flex-col gap-4 justify-center")}>
                        {primaryButton}
                        {secondaryAction}
                    </div>
                    <div className={tw("flex justify-center pt-4")}>
                        <SecuredByCrossmint color={appearance?.colors?.textSecondary} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

type PromptType = "create-wallet" | "transaction" | "not-supported" | "create-wallet-error" | "transaction-error";

type PasskeyPromptProps = {
    state: {
        type: PromptType;
        primaryActionOnClick: () => void;
        secondaryActionOnClick?: () => void;
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
                            <div className={tw("mb-3")}>You're about to create a wallet.</div>
                            <div className={tw("flex flex-col gap-2")}>
                                <div className={tw("flex gap-2")}>
                                    <div>
                                        <PasskeyIcon />
                                    </div>
                                    Your wallet will be secured with a passkey
                                </div>

                                <div className={tw("flex gap-2")}>
                                    <div>
                                        <FingerprintIcon />
                                    </div>
                                    Your device will ask you for your fingerprint, face, or screen lock to set it up
                                </div>
                            </div>
                        </>
                    }
                    primaryButton={
                        <PrimaryButton appearance={appearance} onClick={state.primaryActionOnClick}>
                            Create Wallet
                        </PrimaryButton>
                    }
                />
            );

        case "create-wallet-error":
            return (
                <PasskeyPromptCore
                    title="Wallet Creation Failed"
                    appearance={appearance}
                    content={
                        <div>
                            We couldn't create your wallet. This could be due to rejecting the request, a timeout, or
                            not having access to your passkey on this device.
                        </div>
                    }
                    primaryButton={
                        <PrimaryButton appearance={appearance} onClick={state.primaryActionOnClick}>
                            Try again
                        </PrimaryButton>
                    }
                />
            );

        case "transaction":
            return (
                <PasskeyPromptCore
                    title="Use Your Wallet"
                    appearance={appearance}
                    content={
                        <div className={tw("flex flex-col gap-2")}>
                            <div className={tw("flex gap-2")}>
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
                        <PrimaryButton appearance={appearance} onClick={state.primaryActionOnClick}>
                            Use Wallet
                        </PrimaryButton>
                    }
                />
            );

        case "transaction-error":
            return (
                <PasskeyPromptCore
                    title="Wallet Access Failed"
                    appearance={appearance}
                    content={
                        <div>
                            We couldn't access your wallet. This could be due to rejecting the request, a timeout, or
                            not having access to your passkey on this device.
                        </div>
                    }
                    primaryButton={
                        <PrimaryButton appearance={appearance} onClick={state.primaryActionOnClick}>
                            Try again
                        </PrimaryButton>
                    }
                    secondaryAction={
                        <a
                            href="https://docs.crossmint.com/wallets/smart-wallets/users/troubleshoot"
                            rel="noopener noreferrer"
                            target="_blank"
                            style={{
                                padding: "0.875rem",
                                width: "100%",
                                textAlign: "center",
                                textDecoration: "none",
                                borderRadius: "0.5rem",
                                fontWeight: "bold",
                                backgroundColor: appearance?.colors?.inputBackground || "#F0F2F4",
                                color: appearance?.colors?.textSecondary || "#00150D",
                            }}
                        >
                            Troubleshoot
                        </a>
                    }
                />
            );

        case "not-supported":
            return (
                <PasskeyPromptCore
                    title="Passkeys Not Supported on This Device"
                    appearance={appearance}
                    content={
                        <div>
                            To access your wallet with a passkey, switch to a device or browser that supports passkeys,
                            such as Chrome or Safari on a smartphone, tablet, or modern computer
                        </div>
                    }
                    primaryButton={
                        <PrimaryButton appearance={appearance} onClick={state.primaryActionOnClick}>
                            Understood
                        </PrimaryButton>
                    }
                />
            );

        default:
            return null;
    }
}

const PrimaryButton = ({
    appearance,
    onClick,
    children,
}: { appearance?: UIConfig; onClick: () => void; children: ReactNode }) => {
    return (
        <button
            className={classNames(
                "relative flex text-base p-4 bg-cm-muted-primary text-cm-text-primary items-center w-full rounded-xl justify-center",
                "transition-colors duration-200 ease-in-out",
                "hover:bg-cm-hover focus:bg-cm-hover outline-none"
            )}
            style={{
                borderRadius: appearance?.borderRadius,
                backgroundColor: appearance?.colors?.buttonBackground,
            }}
            onClick={onClick}
        >
            <span className={tw("font-medium")} style={{ margin: "0px 32px", color: appearance?.colors?.textPrimary }}>
                {children}
            </span>
            <span className={tw("sr-only")}>{children}</span>
        </button>
    );
};
