"use client";

import { useState } from "react";
import { useTheme } from "@/lib/theme-context";
import { isAddress } from "viem";

interface AddSignerFormProps {
    walletAddress: string;
    onSignerAdded: () => void;
}

type IntervalOption = "none" | "daily" | "weekly";

const INTERVAL_MAP: Record<IntervalOption, number | undefined> = {
    none: undefined,
    daily: 86400,
    weekly: 604800,
};

export function AddSignerForm({ walletAddress, onSignerAdded }: AddSignerFormProps) {
    const { theme } = useTheme();
    const [signerAddress, setSignerAddress] = useState("");
    const [tokenLocator, setTokenLocator] = useState(theme.defaultToken);
    const [limitAmount, setLimitAmount] = useState(theme.defaultLimit);
    const [interval, setInterval] = useState<IntervalOption>("daily");
    const [recipients, setRecipients] = useState<string[]>([""]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    function addRecipient() {
        setRecipients([...recipients, ""]);
    }

    function removeRecipient(index: number) {
        setRecipients(recipients.filter((_, i) => i !== index));
    }

    function updateRecipient(index: number, value: string) {
        const updated = [...recipients];
        updated[index] = value;
        setRecipients(updated);
    }

    async function handleSubmit() {
        setError(null);
        setSuccess(null);

        if (!isAddress(signerAddress)) {
            setError("Invalid signer address");
            return;
        }

        const validRecipients = recipients.filter((r) => r.trim() !== "");
        for (const r of validRecipients) {
            if (!isAddress(r)) {
                setError(`Invalid recipient address: ${r}`);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const scope: Record<string, unknown> = {
                type: "transfer",
                tokenLocator,
            };

            if (limitAmount) {
                scope.spendingLimit = {
                    amount: limitAmount,
                    ...(INTERVAL_MAP[interval] != null ? { interval: INTERVAL_MAP[interval] } : {}),
                };
            }

            if (validRecipients.length > 0) {
                scope.recipients = validRecipients;
            }

            const body = {
                walletAddress,
                signerAddress,
                scopes: [scope],
            };

            const res = await fetch("/api/wallet/signers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error);
            }

            setSuccess("Scoped signer added successfully");
            setSignerAddress("");
            onSignerAdded();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add signer");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
            <div>
                <h2 className="text-lg font-medium">Add Scoped Signer</h2>
                <p className="text-sm text-muted-foreground">
                    Delegate spending permissions to a {theme.userRole.toLowerCase()} wallet.
                </p>
            </div>

            {error && <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-md text-sm">{error}</div>}
            {success && <div className="bg-success/10 text-success px-3 py-2 rounded-md text-sm">{success}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">{theme.userRole} Wallet Address</label>
                    <input
                        type="text"
                        value={signerAddress}
                        onChange={(e) => setSignerAddress(e.target.value)}
                        className="px-3 py-2 border rounded-md text-sm"
                        placeholder="0x..."
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Token</label>
                    <select
                        value={tokenLocator}
                        onChange={(e) => setTokenLocator(e.target.value)}
                        className="px-3 py-2 border rounded-md text-sm bg-white"
                    >
                        <option value="base-sepolia:usdc">USDC (Base Sepolia)</option>
                        <option value="base-sepolia:eth">ETH (Base Sepolia)</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Spending Limit</label>
                    <input
                        type="number"
                        value={limitAmount}
                        onChange={(e) => setLimitAmount(e.target.value)}
                        className="px-3 py-2 border rounded-md text-sm"
                        placeholder="Amount"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Interval</label>
                    <div className="flex gap-2">
                        {(["none", "daily", "weekly"] as IntervalOption[]).map((opt) => (
                            <button
                                key={opt}
                                onClick={() => setInterval(opt)}
                                className={`px-3 py-2 rounded-md text-sm border transition-colors ${
                                    interval === opt
                                        ? "bg-accent text-accent-foreground border-accent"
                                        : "hover:bg-secondary"
                                }`}
                            >
                                {opt === "none" ? "One-time" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-sm font-medium">Recipient Whitelist</label>
                    {recipients.map((r, i) => (
                        <div key={i} className="flex gap-2">
                            <input
                                type="text"
                                value={r}
                                onChange={(e) => updateRecipient(i, e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-md text-sm"
                                placeholder="0x..."
                            />
                            {recipients.length > 1 && (
                                <button
                                    onClick={() => removeRecipient(i)}
                                    className="px-3 py-2 rounded-md border text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}
                    <button onClick={addRecipient} className="text-sm text-accent hover:underline self-start">
                        + Add recipient
                    </button>
                </div>

            </div>

            <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50"
            >
                {isSubmitting ? "Adding Signer..." : "Add Scoped Signer"}
            </button>
        </div>
    );
}
