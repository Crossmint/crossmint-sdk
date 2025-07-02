"use client";

import { useState } from "react";
import { useWallet, EVMWallet } from "@crossmint/client-sdk-react-ui";
import { cn } from "../lib/utils";

export function EVMSignMessage() {
    const { wallet } = useWallet();
    const [message, setMessage] = useState<string>("");
    const [signature, setSignature] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSignMessage() {
        if (wallet == null) {
            alert("Sign Message: No wallet connected");
            return;
        }

        if (!message.trim()) {
            alert("Sign Message: Please enter a message to sign");
            return;
        }

        // Check if it's an EVM wallet
        if (wallet.chain === "solana") {
            alert("Sign Message: This feature is only available for EVM wallets");
            return;
        }

        try {
            setIsLoading(true);
            setSignature(null);

            // Cast to EVMWallet to access signMessage method
            const evmWallet = EVMWallet.from(wallet);
            const signedMessage = await evmWallet.signMessage(message);
            setSignature(signedMessage);
        } catch (err) {
            console.error("Sign Message: ", err);
            alert("Sign Message: " + err);
        } finally {
            setIsLoading(false);
        }
    }

    const clearSignature = () => {
        setSignature(null);
    };

    // Only show for EVM wallets
    if (wallet?.chain === "solana") {
        return null;
    }

    return (
        <div className="bg-white flex flex-col gap-3 rounded-xl border shadow-sm p-5">
            <div>
                <h2 className="text-lg font-medium">Sign Message</h2>
                <p className="text-sm text-gray-500">Sign a message with your EVM wallet to prove ownership</p>
            </div>

            <div className="flex flex-col gap-3 w-full">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Message to sign</label>
                    <textarea
                        className="w-full px-3 py-2 border rounded-md text-sm resize-none"
                        placeholder="Enter a message to sign..."
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={isLoading}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-2 w-full">
                <button
                    className={cn(
                        "w-full py-2 px-4 rounded-md text-sm font-medium transition-colors",
                        isLoading
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-accent text-white hover:bg-accent/80"
                    )}
                    onClick={handleSignMessage}
                    disabled={isLoading}
                >
                    {isLoading ? "Signing..." : "Sign Message"}
                </button>

                {signature && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-green-800">Signature</p>
                            <button onClick={clearSignature} className="text-green-600 hover:text-green-800 text-sm">
                                Clear
                            </button>
                        </div>
                        <div className="bg-white p-2 rounded border border-green-100">
                            <p className="text-xs text-green-700 break-all font-mono">{signature}</p>
                        </div>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(signature);
                                const button = document.activeElement as HTMLButtonElement;
                                button.disabled = true;
                                const originalContent = button.innerHTML;
                                button.innerHTML = "Copied!";
                                setTimeout(() => {
                                    button.innerHTML = originalContent;
                                    button.disabled = false;
                                }, 2000);
                            }}
                            className="mt-2 text-xs text-green-600 hover:text-green-800 underline"
                        >
                            Copy signature
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
