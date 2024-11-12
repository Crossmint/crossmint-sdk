import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { AuthFormBackButton } from "../../AuthFormBackButton";
import { Web3ConnectorButton } from "./Web3ConnectorButton";
import { metamaskIcon, walletConnectIcon } from "@/icons/base64Icons";
import { Web3ConnectorContainer } from "./Web3ConnectorContainer";
import { useAccount, useDisconnect } from "wagmi";

export function Web3Connectors() {
    const { appearance, step, setStep, setError } = useAuthForm();
    const { isConnected } = useAccount();
    const { disconnect } = useDisconnect();

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
                        <Web3ConnectorButton
                            title="Metamask"
                            appearance={appearance}
                            img={metamaskIcon}
                            onClick={() => {
                                if (isConnected) {
                                    disconnect();
                                }
                                // wait for all disconnect state to be cleared before proceeding to the next step
                                setTimeout(() => {
                                    setStep("web3/metamask");
                                }, 200);
                            }}
                        />
                        <Web3ConnectorButton
                            title="WalletConnect"
                            appearance={appearance}
                            img={walletConnectIcon}
                            onClick={() => {
                                if (isConnected) {
                                    disconnect();
                                }
                                setTimeout(() => {
                                    setStep("web3/walletconnect");
                                }, 200);
                            }}
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
                    onClick={() => {
                        setStep("web3");
                        setError(null);
                    }}
                    iconColor={appearance?.colors?.textPrimary}
                    ringColor={appearance?.colors?.accent}
                />
                <Web3ConnectorContainer providerType="metaMaskSDK" flag="isMetaMask" icon={metamaskIcon} />
            </>
        );
    }

    if (step === "web3/walletconnect") {
        return (
            <>
                <AuthFormBackButton
                    onClick={() => {
                        setStep("web3");
                        setError(null);
                    }}
                    iconColor={appearance?.colors?.textPrimary}
                    ringColor={appearance?.colors?.accent}
                />
                <Web3ConnectorContainer providerType="walletConnect" icon={walletConnectIcon} />
            </>
        );
    }

    return null;
}
