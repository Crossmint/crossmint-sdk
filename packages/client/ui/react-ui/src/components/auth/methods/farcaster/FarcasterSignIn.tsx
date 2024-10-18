import { useEffect, useMemo, useState } from "react";
import { useSignIn, QRCode, type UseSignInData } from "@farcaster/auth-kit";
import { useAuthSignIn } from "@/hooks/useAuthSignIn";
import { FarcasterIcon } from "@/icons/farcaster";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { Spinner } from "@/components/common/Spinner";
import { classNames } from "@/utils/classNames";
import { AuthFormBackButton } from "../../AuthForm";

export function FarcasterSignIn() {
    const { step, appearance, setStep } = useAuthForm();

    if (step === "initial") {
        return (
            <div>
                <button
                    className={classNames(
                        "relative flex text-base p-4 bg-cm-muted-primary text-cm-text-primary border border-cm-border items-center w-full rounded-xl justify-center",
                        "transition-all duration-200 ease-in-out",
                        "focus:outline-none focus:ring-1 focus:ring-opacity-50"
                    )}
                    style={{
                        borderRadius: appearance?.borderRadius,
                        borderColor: appearance?.colors?.border,
                        backgroundColor: appearance?.colors?.buttonBackground,
                        // @ts-expect-error --tw-ring-color is not recognized by typescript but gets picked up by tailwind
                        "--tw-ring-color": appearance?.colors?.accent ?? "#1A73E8",
                    }}
                    onClick={() => {
                        setStep("qrCode");
                    }}
                >
                    <FarcasterIcon className="h-[25px] w-[25px] absolute left-[18px]" />
                    <span
                        className="font-medium"
                        style={{ margin: "0px 32px", color: appearance?.colors?.textPrimary }}
                    >
                        Farcaster
                    </span>
                    <span className="sr-only">Sign in with Farcaster</span>
                </button>
            </div>
        );
    }

    if (step === "qrCode") {
        return <FarcasterQRCode />;
    }

    return null;
}

// We want this to be a separate component so it can completely un-render when the user goes back to the initial screen
function FarcasterQRCode() {
    const { appearance, baseUrl, apiKey, setStep, fetchAuthMaterial, setDialogOpen } = useAuthForm();
    const { onFarcasterSignIn } = useAuthSignIn();
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
        try {
            const oneTimeSecret = await onFarcasterSignIn(data, { baseUrl, apiKey });
            // Step 5. fetch the auth material, close the dialog, and unrender any farcaster client stuff
            await fetchAuthMaterial(oneTimeSecret as string);
            setDialogOpen(false);
            setStep("initial");
        } catch (error) {
            console.error("Error during Farcaster sign-in:", error);
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

            <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                    <h3
                        className="text-lg font-semibold text-cm-text-primary mb-2"
                        style={{ color: appearance?.colors?.textPrimary }}
                    >
                        Sign in with Farcaster
                    </h3>
                    <p
                        className="text-base font-normal text-cm-text-secondary"
                        style={{ color: appearance?.colors?.textSecondary }}
                    >
                        Scan with your phone's camera to continue.
                    </p>
                </div>
                <div
                    className="bg-white aspect-square rounded-lg p-4"
                    style={{
                        backgroundColor: appearance?.colors?.inputBackground,
                        borderRadius: appearance?.borderRadius,
                    }}
                >
                    {qrCodeUrl != null ? (
                        <QRCode uri={qrCodeUrl} size={280} />
                    ) : (
                        <div className="min-h-[246px] flex items-center justify-center">
                            <Spinner
                                style={{
                                    color: appearance?.colors?.textSecondary,
                                    fill: appearance?.colors?.textPrimary,
                                }}
                            />
                        </div>
                    )}
                </div>
                {qrCodeUrl ? (
                    <>
                        <p
                            className="text-base text-center font-normal text-cm-text-secondary"
                            style={{ color: appearance?.colors?.textSecondary }}
                        >
                            Alternatively, click on this link to open Warpcast.
                        </p>
                        <a
                            href={qrCodeUrl}
                            rel="noopener noreferrer"
                            target="_blank"
                            className="text-base font-normal text-cm-ring"
                            style={{ color: appearance?.colors?.textLink }}
                        >
                            Open Warpcast
                        </a>
                    </>
                ) : null}
            </div>
        </div>
    );
}