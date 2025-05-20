import { useState } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";

import { Spinner } from "@/components/common/Spinner";
import { classNames } from "@/utils/classNames";

interface EmailInputProps {
    email: string;
    onConfirm: (email: string) => Promise<void>;
    onCancel?: () => void;
    appearance?: UIConfig;
}

export function EmailConfirmation({ email, onConfirm, onCancel, appearance }: EmailInputProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSendCode = async () => {
        setIsLoading(true);
        try {
            await onConfirm(email);
        } catch (error) {
            console.error("Error sending authorization code:", error);
            setError("Failed to send code. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    const accentColor = appearance?.colors?.accent || "#4CAF50";
    const textColor = appearance?.colors?.textPrimary || "#000000";
    const borderColor = appearance?.colors?.border || "#E0E0E0";

    return (
        <div className="flex flex-col w-full max-w-md mx-auto rounded-xl">
            <h2 className="mb-2" style={{ color: textColor }}>
                Send authorization code to
            </h2>

            <div className="w-full mb-8 p-4 rounded-xl border" style={{ borderColor }}>
                <div className="flex items-center">
                    <div className="flex-shrink-0 mr-3">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-mail-icon lucide-mail"
                        >
                            <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                        </svg>
                    </div>
                    <span style={{ color: textColor }}>{email}</span>
                </div>
            </div>

            {error && <div className="text-red-500 mb-4 text-sm">{error}</div>}

            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 py-4 px-6 border rounded-full text-center font-medium"
                    style={{ borderColor }}
                >
                    Cancel
                </button>

                <button
                    onClick={handleSendCode}
                    disabled={isLoading}
                    className={classNames(
                        "flex-1 py-4 px-6 rounded-full text-white text-center font-medium",
                        isLoading ? "opacity-70" : ""
                    )}
                    style={{ backgroundColor: accentColor }}
                >
                    {isLoading ? (
                        <div className="flex justify-center items-center">
                            <Spinner style={{ color: "white" }} />
                        </div>
                    ) : (
                        "Send code"
                    )}
                </button>
            </div>
        </div>
    );
}
