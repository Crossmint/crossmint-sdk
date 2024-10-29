import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { AuthFormBackButton } from "../../AuthFormBackButton";
import { Web3ProviderButton } from "./Web3ProviderButton";
import { metamaskIcon, walletConnectIcon } from "@/icons/base64Icons";
import { Web3AuthWrapper } from "./Web3AuthWrapper";

export function Web3Providers() {
    const { appearance, step, setStep } = useAuthForm();

    if (step === "web3") {
        return (
            <>
                <AuthFormBackButton
                    onClick={() => setStep("initial")}
                    iconColor={appearance?.colors?.textPrimary}
                    ringColor={appearance?.colors?.accent}
                />
                <div className="flex flex-col items-center gap-2">
                    <div className="text-center mb-6">
                        <h3
                            className="text-lg font-semibold text-cm-text-primary"
                            style={{ color: appearance?.colors?.textPrimary }}
                        >
                            Connect wallet
                        </h3>
                    </div>
                    <div className="flex flex-col gap-[10px] w-full">
                        <Web3ProviderButton
                            title="Metamask"
                            appearance={appearance}
                            img={metamaskIcon}
                            onClick={() => setStep("web3/metamask")}
                        />
                        <Web3ProviderButton
                            title="WalletConnect"
                            appearance={appearance}
                            img={walletConnectIcon}
                            onClick={() => setStep("web3/walletconnect")}
                        />
                    </div>
                </div>
            </>
        );
    }

    if (step === "web3/metamask") {
        return (
            <>
                <AuthFormBackButton
                    onClick={() => setStep("web3")}
                    iconColor={appearance?.colors?.textPrimary}
                    ringColor={appearance?.colors?.accent}
                />
                <Web3AuthWrapper providerType="metaMaskSDK" icon={metamaskIcon} />
            </>
        );
    }

    if (step === "web3/walletconnect") {
        return (
            <>
                <AuthFormBackButton
                    onClick={() => setStep("web3")}
                    iconColor={appearance?.colors?.textPrimary}
                    ringColor={appearance?.colors?.accent}
                />
                <Web3AuthWrapper providerType="walletConnect" icon={walletConnectIcon} />
            </>
        );
    }

    return null;
}
