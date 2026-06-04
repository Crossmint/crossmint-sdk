"use client";

import { useEffect, useState, useCallback } from "react";
import { formatInterval } from "@/lib/utils";

interface BudgetGaugeProps {
    walletAddress: string;
}

interface SpendingLimit {
    amount: string;
    interval?: number;
}

interface GaugeData {
    limit: string;
    interval?: number;
    tokenName: string;
    spent: number;
}

export function BudgetGauge({ walletAddress }: BudgetGaugeProps) {
    const [gauge, setGauge] = useState<GaugeData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchBudget = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/wallet/signers?walletAddress=${encodeURIComponent(walletAddress)}`);
            const data = await res.json();
            if (!res.ok) {
                setGauge(null);
                return;
            }

            const signers = Array.isArray(data.signers) ? data.signers : [];
            for (const signer of signers) {
                if (signer.scopes && signer.scopes.length > 0) {
                    const scope = signer.scopes[0];
                    if (scope.spendingLimit) {
                        const limit: SpendingLimit = scope.spendingLimit;
                        const tokenName = scope.tokenLocator?.split(":").pop()?.toUpperCase() ?? "tokens";
                        setGauge({
                            limit: limit.amount,
                            interval: limit.interval,
                            tokenName,
                            spent: 0,
                        });
                        return;
                    }
                }
            }
            setGauge(null);
        } catch {
            setGauge(null);
        } finally {
            setLoading(false);
        }
    }, [walletAddress]);

    useEffect(() => {
        fetchBudget();
    }, [fetchBudget]);

    if (loading) {
        return null;
    }

    if (gauge == null) {
        return null;
    }

    const limitNum = Number(gauge.limit);
    const remaining = Math.max(0, limitNum - gauge.spent);
    const percentage = limitNum > 0 ? Math.min(100, (gauge.spent / limitNum) * 100) : 0;

    return (
        <div className="bg-white rounded-xl border shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Budget</h2>
                <span className="text-xs text-muted-foreground">{formatInterval(gauge.interval)} limit</span>
            </div>

            <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                        width: `${100 - percentage}%`,
                        backgroundColor: percentage > 80 ? "var(--destructive)" : "var(--accent)",
                    }}
                />
            </div>

            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                    Spent: {gauge.spent} {gauge.tokenName}
                </span>
                <span className="font-medium">
                    Remaining: {remaining} {gauge.tokenName}
                </span>
            </div>
        </div>
    );
}
