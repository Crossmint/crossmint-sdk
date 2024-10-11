import { useState } from "react";
import { useSignIn, QRCode } from "@farcaster/auth-kit";
import { useAuthSignIn } from "@/hooks/useAuthSignIn";
import { FarcasterIcon } from "@/icons/farcaster";
import { useAuthDialog } from "@/providers/auth/AuthDialogProvider";
import { DialogBackButton } from "@/components/common/Dialog";
import { Spinner } from "@/components/common/Spinner";
import { classNames } from "@/utils/classNames";

export function FarcasterSignIn() {
    const { step, appearance, setStep } = useAuthDialog();

    const [isLoading, setIsLoading] = useState(false);
    const { onFarcasterSignIn } = useAuthSignIn();

    const { signIn, url: qrCodeUrl, connect, signOut } = useSignIn({});

    console.log({ qrCodeUrl });
    // const handleFarcasterSignInSuccess = async (data: UseSignInData) => {
    //     setIsLoading(true);

    //     try {
    //         const oneTimeSecret = await onFarcasterSignIn(data, {
    //             baseUrl,
    //             apiKey,
    //         });

    //         console.log({ oneTimeSecretFromFarcasterAUTH: oneTimeSecret });
    //         // fetchAuthMaterial(oneTimeSecret as string);
    //     } catch (e) {
    //         console.error("Error signing in via email ", e);
    //     }
    // };

    if (step === "initial") {
        return (
            <div>
                <button
                    className={classNames(
                        "relative flex text-base p-4 bg-[#F0F2F4] text-[#00150D] border items-center w-full rounded-xl justify-center",
                        "transition-all duration-200 ease-in-out", // Add smooth transition
                        "focus:outline-none focus:ring-1 focus:ring-opacity-50" // Add focus ring
                    )}
                    style={{
                        borderRadius: appearance?.borderRadius,
                        borderColor: appearance?.colors?.border,
                        backgroundColor: appearance?.colors?.buttonBackground,
                        // @ts-expect-error --tw-ring-color is not recognized by typescript but gets picked up by tailwind
                        "--tw-ring-color": appearance?.colors?.accent ?? "#1A73E8",
                    }}
                    onClick={() => {
                        connect();
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

                    {/* For accessibility sake   */}
                    <span className="sr-only">Sign in with Farcaster</span>
                </button>
            </div>
        );
    }

    if (step === "qrCode") {
        return (
            <div>
                <DialogBackButton
                    onClick={() => {
                        signOut();
                        setStep("initial");
                    }}
                    iconColor={appearance?.colors?.textPrimary}
                />

                <div className="flex flex-col items-center gap-4 mt-6">
                    <div className="text-center">
                        <h3
                            className="text-lg font-semibold text-custom-text-primary"
                            style={{ color: appearance?.colors?.textPrimary }}
                        >
                            Sign in with Farcaster
                        </h3>
                        <p
                            className="text-base font-normal text-[#67797F]"
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
                                <Spinner />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
}
