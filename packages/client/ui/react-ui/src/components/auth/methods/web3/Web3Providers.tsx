import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { AuthFormBackButton } from "../../AuthFormBackButton";
import { Web3ProviderButton } from "./Web3ProviderButton";
import { coinbaseIcon, metamaskIcon, walletConnectIcon } from "@/icons/base64Icons";
import { Web3AuthWrapper } from "./Web3AuthWrapper";
import { useDisconnect } from "wagmi";
import { useState } from "react";

export function Web3Providers() {
    const { appearance } = useAuthForm();
    const { disconnect } = useDisconnect();

    const [step, setStep] = useState("web3");

    const renderContent = () => {
        switch (step) {
            case "web3":
                return (
                    <>
                        <div className="text-center mb-6">
                            <h3
                                className="text-lg font-semibold text-cm-text-primary"
                                style={{ color: appearance?.colors?.textPrimary }}
                            >
                                Connect wallet
                            </h3>
                        </div>
                        <div className="flex flex-col gap-4 w-full">
                            <Web3ProviderButton
                                title="Metamask"
                                appearance={appearance}
                                img={metamaskIcon}
                                onClick={() => setStep("web3/metamask")}
                            />
                            <Web3ProviderButton
                                title="Coinbase Wallet"
                                appearance={appearance}
                                img={coinbaseIcon}
                                onClick={() => setStep("web3/coinbase")}
                            />
                            <Web3ProviderButton
                                title="WalletConnect"
                                appearance={appearance}
                                img={walletConnectIcon}
                                onClick={() => setStep("web3/walletconnect")}
                            />
                        </div>
                    </>
                );
            case "web3/metamask":
                return <Web3AuthWrapper providerType="metaMaskSDK" icon={metamaskIcon} />;
            case "web3/coinbase":
                return <Web3AuthWrapper providerType="coinbaseWalletSDK" icon={coinbaseIcon} />;
            case "web3/walletconnect":
                return <Web3AuthWrapper providerType="walletConnect" icon={walletConnectIcon} />;
            default:
                return null;
        }
    };

    const handleBack = () => {
        disconnect();
        if (step.startsWith("web3/")) {
            return setStep("web3");
        }
        return setStep("initial");
    };

    return (
        <div>
            <AuthFormBackButton
                onClick={handleBack}
                iconColor={appearance?.colors?.textPrimary}
                ringColor={appearance?.colors?.accent}
            />
            <div className="flex flex-col items-center gap-2">{renderContent()}</div>
        </div>
    );
}
