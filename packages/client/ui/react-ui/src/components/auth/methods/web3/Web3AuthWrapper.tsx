import { useState, useEffect } from "react";
import { useAuthSignIn } from "@/hooks/useAuthSignIn";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { Web3ConnectButton } from "./Web3ConnectButton";
import { useAccount, useChainId, useConnect, useSignMessage } from "wagmi";

interface Web3AuthWrapperProps {
    providerType: "metaMaskSDK" | "coinbaseWalletSDK" | "walletConnect";
    flag?: "isMetaMask";
    icon: string;
}

export function Web3AuthWrapper({ providerType, flag, icon }: Web3AuthWrapperProps) {
    const { appearance, baseUrl, apiKey, fetchAuthMaterial } = useAuthForm();
    const { onSmartWalletSignIn, onSmartWalletAuthenticate } = useAuthSignIn();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const chainId = useChainId();
    const { address, status: accountStatus } = useAccount(); // hook is causing a hydration error when navigating back
    const { signMessageAsync, status: signMessageStatus } = useSignMessage();
    const { connect, connectors } = useConnect({
        mutation: {
            onError: () => setIsLoading(false),
        },
    });

    // fallback to walletConnect if the extension is not installed
    const isExtensionInstalled = window.ethereum?.[flag as keyof typeof window.ethereum] ?? false;
    if (!isExtensionInstalled) {
        providerType = "walletConnect";
    }

    const connector = connectors.find((c) => c.id === providerType);

    useEffect(() => {
        if (address != null) {
            handleSignIn();
        }
    }, [address]);

    const handleSignIn = async () => {
        if (address == null) {
            return;
        }
        setIsLoading(true);

        try {
            const res = await onSmartWalletSignIn(address, {
                baseUrl: baseUrl,
                apiKey: apiKey,
            });
            const signature = await signMessageAsync({ message: res.challenge });
            const authResponse = (await onSmartWalletAuthenticate(address, signature, {
                baseUrl,
                apiKey,
            })) as { oneTimeSecret: string };

            const oneTimeSecret = authResponse.oneTimeSecret;
            await fetchAuthMaterial(oneTimeSecret);
        } catch (error) {
            console.error(`Error connecting to ${providerType}:`, error);
            setError(`Error connecting to ${providerType}. Please try again or contact support.`);
        } finally {
            setIsLoading(false);
        }
    };

    const isLoadingOrPending =
        isLoading ||
        accountStatus === "connecting" ||
        accountStatus === "reconnecting" ||
        signMessageStatus === "pending";

    return (
        <Web3ConnectButton
            icon={icon}
            appearance={appearance}
            headingText={signMessageStatus === "pending" ? "Sign to verify" : "Connect your wallet"}
            buttonText={error != null && !isLoadingOrPending ? "Retry" : isLoadingOrPending ? "Connecting" : "Connect"}
            isLoading={isLoadingOrPending}
            onConnectClick={() => {
                if (address != null) {
                    handleSignIn();
                } else if (connector) {
                    connect({ connector, chainId });
                }
            }}
        />
    );
}
