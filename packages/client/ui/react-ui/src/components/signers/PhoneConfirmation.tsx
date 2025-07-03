import { useState } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";

import { Spinner } from "@/components/common/Spinner";
import { classNames } from "@/utils/classNames";

interface PhoneConfirmationProps {
    phone: string;
    onConfirm: (phone: string) => Promise<void>;
    onCancel?: () => void;
    appearance?: UIConfig;
}

export function PhoneConfirmation({ phone, onConfirm, onCancel, appearance }: PhoneConfirmationProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSendCode = async () => {
        setIsLoading(true);
        try {
            await onConfirm(phone);
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
                            className="lucide lucide-phone"
                        >
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                    </div>
                    <span style={{ color: textColor }}>{phone}</span>
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
