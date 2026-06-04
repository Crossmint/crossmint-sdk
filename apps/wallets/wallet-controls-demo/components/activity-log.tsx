"use client";

import { useState } from "react";
import { shortenAddress } from "@/lib/utils";

interface ActivityLogProps {
    walletAddress: string;
}

interface Transfer {
    token: {
        amount: string;
        symbol?: string;
        locator?: string;
    };
    sender: { address: string };
    recipient: { address: string };
    status?: string;
}

export function ActivityLog({ walletAddress: _walletAddress }: ActivityLogProps) {
    const [transfers] = useState<Transfer[]>([]);

    return (
        <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
            <div>
                <h2 className="text-lg font-medium">Activity Log</h2>
                <p className="text-sm text-muted-foreground">Recent wallet transactions.</p>
            </div>

            {transfers.length === 0 ? (
                <div className="text-muted-foreground text-sm">
                    No recent activity. Transactions will appear here after transfers are made.
                </div>
            ) : (
                <div className="space-y-2">
                    {transfers.map((tx, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b py-2 last:border-0">
                            <div>
                                <span className="text-sm font-medium">
                                    {tx.token.amount} {tx.token.symbol ?? tx.token.locator}
                                </span>
                                <span className="text-xs text-muted-foreground ml-2">
                                    {shortenAddress(tx.sender.address)} → {shortenAddress(tx.recipient.address)}
                                </span>
                            </div>
                            <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                    tx.status === "successful"
                                        ? "bg-success/10 text-success"
                                        : "bg-destructive/10 text-destructive"
                                }`}
                            >
                                {tx.status ?? "pending"}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
