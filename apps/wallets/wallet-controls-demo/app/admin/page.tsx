"use client";

import { useState, useCallback } from "react";
import { useTheme } from "@/lib/theme-context";
import { shortenAddress } from "@/lib/utils";
import { AddSignerForm } from "@/components/add-signer-form";
import { SignersList } from "@/components/signers-list";
import { ActivityLog } from "@/components/activity-log";

export default function AdminPage() {
    const { theme } = useTheme();
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isFunding, setIsFunding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fundAmount, setFundAmount] = useState("100");
    const [signersVersion, setSignersVersion] = useState(0);

    const refreshSigners = useCallback(() => {
        setSignersVersion((v) => v + 1);
    }, []);

    async function handleCreateWallet() {
        setIsCreating(true);
        setError(null);
        try {
            const res = await fetch("/api/wallet/create", { method: "POST" });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error);
            }
            setWalletAddress(data.address);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create wallet");
        } finally {
            setIsCreating(false);
        }
    }

    async function handleFundWallet() {
        if (walletAddress == null) {
            return;
        }
        setIsFunding(true);
        setError(null);
        try {
            const res = await fetch("/api/wallet/fund", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ walletAddress, amount: Number(fundAmount) }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fund wallet");
        } finally {
            setIsFunding(false);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">{theme.adminRole} Dashboard</h1>
                <p className="text-muted-foreground text-sm mt-1">{theme.description}</p>
            </div>

            {error && <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">{error}</div>}

            <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
                <div>
                    <h2 className="text-lg font-medium">Wallet Management</h2>
                    <p className="text-sm text-muted-foreground">
                        Create a smart wallet with a server signer and fund it with test tokens.
                    </p>
                </div>

                {walletAddress == null ? (
                    <button
                        onClick={handleCreateWallet}
                        disabled={isCreating}
                        className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50"
                    >
                        {isCreating ? "Creating..." : "Create Wallet"}
                    </button>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">Wallet:</span>
                            <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                                {shortenAddress(walletAddress)}
                            </code>
                            <button
                                onClick={() => navigator.clipboard.writeText(walletAddress)}
                                className="text-xs text-accent hover:underline"
                            >
                                Copy
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={fundAmount}
                                onChange={(e) => setFundAmount(e.target.value)}
                                className="w-24 px-3 py-1.5 border rounded-md text-sm"
                                placeholder="Amount"
                            />
                            <button
                                onClick={handleFundWallet}
                                disabled={isFunding}
                                className="px-4 py-1.5 rounded-md text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50"
                            >
                                {isFunding ? "Funding..." : "Fund Wallet (Staging)"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {walletAddress && (
                <>
                    <AddSignerForm walletAddress={walletAddress} onSignerAdded={refreshSigners} />
                    <SignersList walletAddress={walletAddress} version={signersVersion} onRevoke={refreshSigners} />
                    <ActivityLog walletAddress={walletAddress} />
                </>
            )}
        </div>
    );
}
