import { useEffect, useMemo, useState } from "react";
import { useSignIn, QRCode, type UseSignInData } from "@farcaster/auth-kit";
import type { UIConfig } from "@crossmint/common-sdk-base";
import styled from "@emotion/styled";
import { FarcasterIcon } from "@/icons/farcaster";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { Spinner } from "@/components/common/Spinner";
import { AuthFormBackButton } from "../../AuthFormBackButton";
import { useCrossmintAuth } from "@/hooks/useCrossmintAuth";
import { OAuthButton } from "@/components/common/OAuthButton";
import { theme } from "@/styles";

const QRContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
`;

const TextContainer = styled.div`
    text-align: center;
`;

const QRTitle = styled.h3<{ appearance?: UIConfig }>`
    font-size: 18px;
    font-weight: 600;
    color: ${(props) => props.appearance?.colors?.textPrimary || theme["cm-text-primary"]};
    margin: 0 0 8px 0;
`;

const QRDescription = styled.p<{ appearance?: UIConfig }>`
    font-size: 16px;
    font-weight: 400;
    color: ${(props) => props.appearance?.colors?.textSecondary || theme["cm-text-secondary"]};
    margin: 0;
`;

const QRCodeContainer = styled.div<{ appearance?: UIConfig }>`
    background-color: ${(props) => props.appearance?.colors?.inputBackground || theme["cm-background-primary"]};
    aspect-ratio: 1;
    border-radius: ${(props) => props.appearance?.borderRadius || "8px"};
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const SpinnerContainer = styled.div`
    min-height: 246px;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const AlternativeText = styled.p<{ appearance?: UIConfig }>`
    font-size: 16px;
    text-align: center;
    font-weight: 400;
    color: ${(props) => props.appearance?.colors?.textSecondary || theme["cm-text-secondary"]};
    margin: 0;
`;

const WarpcastLink = styled.a<{ appearance?: UIConfig }>`
    font-size: 16px;
    font-weight: 400;
    color: ${(props) => props.appearance?.colors?.textLink || theme["cm-accent"]};
    text-decoration: none;
    
    &:hover {
        text-decoration: underline;
    }
`;

export function FarcasterSignIn() {
    const { step, appearance, setStep, setError } = useAuthForm();

    if (step === "initial") {
        return (
            <OAuthButton
                icon={<FarcasterIcon style={{ height: "25px", width: "25px" }} />}
                appearance={appearance}
                onButtonClick={() => {
                    setStep("qrCode");
                    setError(null);
                }}
            >
                Sign in with Farcaster
            </OAuthButton>
        );
    }

    if (step === "qrCode") {
        return <FarcasterQRCode />;
    }

    return null;
}

// We want this to be a separate component so it can completely un-render when the user goes back to the initial screen
function FarcasterQRCode() {
    const { crossmintAuth } = useCrossmintAuth();
    const { appearance, setStep, setDialogOpen, setError } = useAuthForm();
    const [farcasterData, setFarcasterData] = useState<UseSignInData | null>(null);

    const farcasterProps = useMemo(
        () => ({
            onSuccess: (data: UseSignInData) => {
                // Step 3. set the farcaster data once the sign in is successful
                setFarcasterData(data);
            },
        }),
        []
    );

    const { signIn, url: qrCodeUrl, connect, signOut, isConnected } = useSignIn(farcasterProps);

    const handleFarcasterSignIn = async (data: UseSignInData) => {
        setError(null);
        try {
            const oneTimeSecret = await crossmintAuth?.signInWithFarcaster(data);
            // Step 5. fetch the auth material, close the dialog, and unrender any farcaster client stuff
            await crossmintAuth?.handleRefreshAuthMaterial(oneTimeSecret as string);
            setDialogOpen(false);
            setStep("initial");
        } catch (error) {
            console.error("Error during Farcaster sign-in:", error);
            setError("Failed to sign in with Farcaster");
        }
    };

    useEffect(() => {
        if (farcasterData != null) {
            // Step 4. call the handleFarcasterSignInfunction to handle the sign in
            handleFarcasterSignIn(farcasterData);
        }
    }, [farcasterData]);

    useEffect(() => {
        if (isConnected) {
            // Step 2. once connected, call the signIn function to start the sign in process
            signIn();
        }
    }, [isConnected]);

    useEffect(() => {
        // Step 1. call the connect function to initialize the connection
        connect();
    }, []);

    return (
        <div>
            <AuthFormBackButton
                onClick={() => {
                    signOut();
                    setStep("initial");
                }}
                iconColor={appearance?.colors?.textPrimary}
                ringColor={appearance?.colors?.accent}
            />

            <QRContainer>
                <TextContainer>
                    <QRTitle appearance={appearance}>Sign in with Farcaster</QRTitle>
                    <QRDescription appearance={appearance}>Scan with your phone's camera to continue.</QRDescription>
                </TextContainer>

                <QRCodeContainer appearance={appearance}>
                    {qrCodeUrl != null ? (
                        <QRCode uri={qrCodeUrl} size={280} />
                    ) : (
                        <SpinnerContainer>
                            <Spinner
                                style={{
                                    color: appearance?.colors?.textSecondary,
                                    fill: appearance?.colors?.textPrimary,
                                }}
                            />
                        </SpinnerContainer>
                    )}
                </QRCodeContainer>

                {qrCodeUrl ? (
                    <>
                        <AlternativeText appearance={appearance}>
                            Alternatively, click on this link to open Warpcast.
                        </AlternativeText>
                        <WarpcastLink
                            href={qrCodeUrl}
                            rel="noopener noreferrer"
                            target="_blank"
                            appearance={appearance}
                        >
                            Open Warpcast
                        </WarpcastLink>
                    </>
                ) : (
                    <div style={{ height: "66px" }} />
                )}
            </QRContainer>
        </div>
    );
}
