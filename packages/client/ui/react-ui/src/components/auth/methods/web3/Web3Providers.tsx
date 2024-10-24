import { useState } from "react";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { metamaskIcon, coinbaseIcon, walletConnectIcon } from "@/icons/base64Icons";
import { useAuthSignIn } from "@/hooks/useAuthSignIn";
import { Web3ProviderButton } from "./Web3ProviderButton";
import { AuthFormBackButton } from "../../AuthFormBackButton";
import { PopupWindow } from "@crossmint/client-sdk-window";

export function Web3Providers() {
    const { appearance, setStep, baseUrl, apiKey, fetchAuthMaterial } = useAuthForm();
    const { onSmartWalletSignIn, onSmartWalletAuthenticate } = useAuthSignIn();

    const [isLoading, setIsLoading] = useState<"metamask" | "coinbase" | "walletconnect" | null>(null);

    const connectMetamask = async () => {
        if (!window.ethereum) {
            return;
        }
        setIsLoading("metamask");

        try {
            const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
            const res = await onSmartWalletSignIn(address, {
                baseUrl: baseUrl,
                apiKey: apiKey,
            });

            const signature = await window.ethereum.request({
                method: "personal_sign",
                params: [res.challenge, address],
            });

            const authResponse = (await onSmartWalletAuthenticate(address, signature as unknown as string, {
                baseUrl,
                apiKey,
            })) as { oneTimeSecret: string };

            const oneTimeSecret = authResponse.oneTimeSecret;
            await fetchAuthMaterial(oneTimeSecret);
        } catch (error) {
            console.error("Error connecting to MetaMask:", error);
        } finally {
            setIsLoading(null);
        }
    };

    const connectCoinbase = async () => {
        try {
            setIsLoading("coinbase");
            const baseUrl = "https://keys.coinbase.com/connect";
            const popup = await PopupWindow.init(baseUrl, {
                awaitToLoad: false,
                crossOrigin: true,
                width: 400,
                height: 700,
            });

            //todo fix this
        } catch (error) {
            console.error("Error connecting to Coinbase:", error);
        } finally {
            setIsLoading(null);
        }
    };

    return (
        <div>
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
                <div className="flex flex-col gap-4 w-full">
                    <Web3ProviderButton
                        title="Metamask"
                        isLoading={isLoading === "metamask"}
                        disabled={isLoading === "metamask"}
                        appearance={appearance}
                        img={metamaskIcon}
                        onClick={connectMetamask}
                    />
                    <Web3ProviderButton
                        title="Coinbase Wallet"
                        isLoading={isLoading === "coinbase"}
                        disabled={isLoading === "coinbase"}
                        appearance={appearance}
                        img={coinbaseIcon}
                        onClick={connectCoinbase}
                    />
                    <Web3ProviderButton
                        title="WalletConnect"
                        isLoading={false}
                        appearance={appearance}
                        img={walletConnectIcon}
                    />
                </div>
            </div>
        </div>
    );
}
