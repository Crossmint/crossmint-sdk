"use client";

import { useState } from "react";
import { useWallet } from "@crossmint/client-sdk-react-ui";
import { isAddress } from "viem";

const SCOPE_ERROR_PATTERNS: Record<string, string> = {
    "spending limit": "Over spending limit — you have exceeded your allowed amount for this period.",
    recipient: "Recipient not whitelisted — this address is not in your approved recipients list.",
    expired: "Signer expired — your access has expired. Contact your admin for renewal.",
    "token not": "Token not in scope — you are not authorized to transfer this token.",
};

function parseScopeError(message: string): string {
    const lower = message.toLowerCase();
    for (const [pattern, friendly] of Object.entries(SCOPE_ERROR_PATTERNS)) {
        if (lower.includes(pattern)) {
            return friendly;
        }
    }
    return message;
}

export function EmployeeTransfer() {
    const { wallet } = useWallet();
    const [token, setToken] = useState("usdc");
    const [amount, setAmount] = useState("");
    const [recipient, setRecipient] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{ link: string } | null>(null);

    async function handleTransfer() {
        setError(null);
        setSuccess(null);

        if (wallet == null) {
            setError("Wallet not connected");
            return;
        }

        if (!recipient || !isAddress(recipient)) {
            setError("Invalid recipient address");
            return;
        }

        if (!amount || Number(amount) <= 0) {
            setError("Enter a valid amount");
            return;
        }

        setIsLoading(true);
        try {
            const tx = await wallet.send(recipient, token, amount);
            setSuccess({ link: tx.explorerLink });
            setAmount("");
            setRecipient("");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Transfer failed";
            setError(parseScopeError(message));
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
            <div>
                <h2 className="text-lg font-medium">Transfer Funds</h2>
                <p className="text-sm text-muted-foreground">Send tokens within your authorized scope.</p>
            </div>

            {error && <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-md text-sm">{error}</div>}
            {success && (
                <div className="bg-success/10 text-success px-3 py-2 rounded-md text-sm">
                    Transfer successful!{" "}
                    <a href={success.link} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                        View on explorer
                    </a>
                </div>
            )}

            <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Token</label>
                    <div className="flex gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="token"
                                className="h-4 w-4"
                                checked={token === "usdc"}
                                onChange={() => setToken("usdc")}
                            />
                            <span className="text-sm">USDC</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="token"
                                className="h-4 w-4"
                                checked={token === "eth"}
                                onChange={() => setToken("eth")}
                            />
                            <span className="text-sm">ETH</span>
                        </label>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Amount</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="px-3 py-2 border rounded-md text-sm"
                        placeholder="0.00"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Recipient Address</label>
                    <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="px-3 py-2 border rounded-md text-sm"
                        placeholder="0x..."
                    />
                </div>
            </div>

            <button
                onClick={handleTransfer}
                disabled={isLoading}
                className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    isLoading
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-accent text-accent-foreground hover:bg-accent/80"
                }`}
            >
                {isLoading ? "Transferring..." : "Transfer"}
            </button>
        </div>
    );
}
