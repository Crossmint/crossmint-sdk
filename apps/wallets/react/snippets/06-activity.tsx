"use client";

import { useWallet } from "@crossmint/client-sdk-react-ui";
import { useState } from "react";

export function Activity() {
    const { wallet } = useWallet();
    const [transfers, setTransfers] = useState<any[]>([]);

    const loadActivity = async () => {
        if (!wallet) return;
        const res = await wallet.transfers({ tokens: "usdxm,usdc", status: "successful" });
        setTransfers(res?.data ?? []);
    };

    return (
        <div className="qs-card qs-card--nested">
            <div className="qs-flex qs-flex--between qs-flex--center">
                <p className="qs-label">Activity</p>
                <button className="qs-btn qs-btn--ghost" onClick={loadActivity}>
                    Load
                </button>
            </div>
            {transfers.length === 0 && <p className="qs-text-muted qs-mt-sm">No transactions yet</p>}
            <div style={{ maxHeight: 200, overflow: "auto" }}>
                {transfers.map((tx, i) => (
                    <div key={i} className="qs-details__row">
                        <span className="qs-details__label">
                            {tx.token?.symbol ?? tx.token?.locator} &rarr; {tx.recipient?.address?.slice(0, 8)}...
                        </span>
                        <span className="qs-details__value">{tx.token?.amount}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
