"use client";

import { useEffect, useState, useCallback } from "react";
import { shortenAddress, formatInterval } from "@/lib/utils";

interface SignersListProps {
    walletAddress: string;
    version: number;
    onRevoke: () => void;
}

interface Scope {
    type: string;
    tokenLocator?: string;
    spendingLimit?: {
        amount: string;
        interval?: number;
    };
    recipients?: string[];
}

interface Signer {
    locator: string;
    type: string;
    address?: string;
    scopes?: Scope[];
    expiresAt?: string;
}

export function SignersList({ walletAddress, version, onRevoke }: SignersListProps) {
    const [signers, setSigners] = useState<Signer[]>([]);
    const [loading, setLoading] = useState(false);
    const [revokingLocator, setRevokingLocator] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchSigners = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/wallet/signers?walletAddress=${encodeURIComponent(walletAddress)}`);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error);
            }
            setSigners(Array.isArray(data.signers) ? data.signers : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch signers");
        } finally {
            setLoading(false);
        }
    }, [walletAddress]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: version triggers refetch on signer changes
    useEffect(() => {
        fetchSigners();
    }, [fetchSigners, version]);

    async function handleRevoke(address: string) {
        setRevokingLocator(address);
        setError(null);
        try {
            const res = await fetch("/api/wallet/signers", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ walletAddress, signerAddress: address }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error);
            }
            onRevoke();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to revoke signer");
        } finally {
            setRevokingLocator(null);
        }
    }

    return (
        <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
            <div>
                <h2 className="text-lg font-medium">Active Signers</h2>
                <p className="text-sm text-muted-foreground">Manage delegated signers and their permissions.</p>
            </div>

            {error && <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-md text-sm">{error}</div>}

            {loading ? (
                <div className="text-muted-foreground text-sm">Loading signers...</div>
            ) : signers.length === 0 ? (
                <div className="text-muted-foreground text-sm">No signers registered yet.</div>
            ) : (
                <div className="space-y-3">
                    {signers.map((signer) => (
                        <div key={signer.locator} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-medium font-mono">
                                        {signer.address ? shortenAddress(signer.address) : signer.locator}
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-2">{signer.type}</span>
                                </div>
                                {signer.address && (
                                    <button
                                        onClick={() => handleRevoke(signer.address!)}
                                        disabled={revokingLocator === signer.address}
                                        className="px-3 py-1 rounded-md text-xs font-medium border text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                    >
                                        {revokingLocator === signer.address ? "Revoking..." : "Revoke"}
                                    </button>
                                )}
                            </div>

                            {signer.expiresAt && (
                                <div className="text-xs text-muted-foreground">
                                    Expires: {new Date(signer.expiresAt).toLocaleString()}
                                </div>
                            )}

                            {signer.scopes && signer.scopes.length > 0 && (
                                <div className="space-y-1">
                                    {signer.scopes.map((scope, idx) => (
                                        <div key={idx} className="bg-muted/50 rounded-md px-3 py-2 text-xs space-y-0.5">
                                            <div className="flex gap-4">
                                                <span>
                                                    <strong>Token:</strong> {scope.tokenLocator}
                                                </span>
                                                {scope.spendingLimit && (
                                                    <span>
                                                        <strong>Limit:</strong> {scope.spendingLimit.amount} (
                                                        {formatInterval(scope.spendingLimit.interval)})
                                                    </span>
                                                )}
                                            </div>
                                            {scope.recipients && scope.recipients.length > 0 && (
                                                <div>
                                                    <strong>Recipients:</strong>{" "}
                                                    {scope.recipients.map(shortenAddress).join(", ")}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
