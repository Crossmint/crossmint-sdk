"use client";

import { useEffect, useState, useCallback } from "react";
import { formatInterval, shortenAddress } from "@/lib/utils";

interface PermissionsSummaryProps {
    walletAddress: string;
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

interface SignerInfo {
    locator: string;
    scopes?: Scope[];
    expiresAt?: string;
}

export function PermissionsSummary({ walletAddress }: PermissionsSummaryProps) {
    const [signerInfo, setSignerInfo] = useState<SignerInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPermissions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/wallet/signers?walletAddress=${encodeURIComponent(walletAddress)}`);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error);
            }

            const signers: SignerInfo[] = Array.isArray(data.signers) ? data.signers : [];
            const myScoped = signers.find((s) => s.scopes && s.scopes.length > 0);
            setSignerInfo(myScoped ?? null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load permissions");
        } finally {
            setLoading(false);
        }
    }, [walletAddress]);

    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);

    if (loading) {
        return (
            <div className="bg-white rounded-xl border shadow-sm p-5">
                <div className="text-muted-foreground text-sm">Loading permissions...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl border shadow-sm p-5">
                <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-md text-sm">{error}</div>
            </div>
        );
    }

    if (signerInfo == null) {
        return (
            <div className="bg-white rounded-xl border shadow-sm p-5">
                <h2 className="text-lg font-medium">Your Permissions</h2>
                <p className="text-sm text-muted-foreground mt-2">
                    No scoped permissions found for your wallet. Ask your admin to grant you access.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border shadow-sm p-5 space-y-3">
            <h2 className="text-lg font-medium">Your Permissions</h2>

            {signerInfo.expiresAt && (
                <div className="text-sm text-muted-foreground">
                    Access expires: {new Date(signerInfo.expiresAt).toLocaleString()}
                </div>
            )}

            {signerInfo.scopes?.map((scope, idx) => {
                const tokenName = scope.tokenLocator?.split(":").pop()?.toUpperCase() ?? "tokens";
                return (
                    <div key={idx} className="bg-accent/5 rounded-lg px-4 py-3 space-y-1">
                        {scope.spendingLimit && (
                            <p className="text-sm">
                                You can spend up to{" "}
                                <strong>
                                    {scope.spendingLimit.amount} {tokenName}
                                </strong>
                                {scope.spendingLimit.interval != null && (
                                    <> per {formatInterval(scope.spendingLimit.interval).toLowerCase()} period</>
                                )}
                            </p>
                        )}
                        {scope.recipients && scope.recipients.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                                Allowed recipients: {scope.recipients.map(shortenAddress).join(", ")}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
