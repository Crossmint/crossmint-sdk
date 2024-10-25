import { useState, useEffect, useCallback } from "react";
import { useAuthSignIn } from "@/hooks/useAuthSignIn";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { Web3ConnectButton } from "./Web3ConnectButton";
import { type Connector, useAccount, useChainId, useConnect, useDisconnect, useSignMessage } from "wagmi";

interface Web3AuthWrapperProps {
    providerType: "metaMaskSDK" | "coinbaseWalletSDK" | "walletConnect";
    icon: string;
}

export function Web3AuthWrapper({ providerType, icon }: Web3AuthWrapperProps) {
    const { appearance, baseUrl, apiKey, fetchAuthMaterial } = useAuthForm();
    const { onSmartWalletSignIn, onSmartWalletAuthenticate } = useAuthSignIn();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const chainId = useChainId();
    const { address, status } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const { connect, connectors } = useConnect();
    const { disconnect } = useDisconnect();

    const connector = connectors.find((c) => c.id === providerType);

    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 2;

    const resetConnection = useCallback(() => {
        disconnect();
        connect({ connector: connector as Connector, chainId });
    }, [disconnect, connect, connector, chainId]);

    // self-healing mechanism
    useEffect(() => {
        if (error != null && retryCount < MAX_RETRIES) {
            const timer = setTimeout(
                () => {
                    setRetryCount((prev) => prev + 1);
                    resetConnection();
                },
                1000 * (retryCount + 1)
            ); // Exponential backoff

            return () => clearTimeout(timer);
        } else if (retryCount >= MAX_RETRIES) {
            console.error(`Error connecting to ${providerType}:`, error);
        }
    }, [error, retryCount, resetConnection]);

    // Reset retry count when successfully connected
    useEffect(() => {
        if (status === "connected") {
            setRetryCount(0);
            setError(null);
        }
    }, [status]);

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

    return (
        <Web3ConnectButton
            icon={icon}
            appearance={appearance}
            headingText={
                status === "reconnecting" || status === "connecting" ? "Sign to verify" : "Connect your wallet"
            }
            buttonText={
                error != null
                    ? "Retry"
                    : status === "connecting" || status === "reconnecting" || isLoading
                      ? "Connecting"
                      : "Connect"
            }
            isLoading={isLoading || status === "connecting" || status === "reconnecting"}
            onConnectClick={() =>
                address != null ? handleSignIn() : connect({ connector: connector as Connector, chainId })
            }
        />
    );
}
