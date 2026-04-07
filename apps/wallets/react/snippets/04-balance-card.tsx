"use client";

import { useWallet } from "@crossmint/client-sdk-react-ui";
import { useState } from "react";

const TOKENS = ["usdxm", "usdc"];

export function BalanceCard() {
    const { wallet } = useWallet();
    const [balances, setBalances] = useState<Record<string, string>>({});

    const refreshBalance = async () => {
        if (!wallet) return;
        const res = await wallet.balances(TOKENS);
        const map: Record<string, string> = {};
        for (const t of res.tokens) {
            map[t.symbol] = t.amount;
        }
        setBalances(map);
    };

    const handleFund = async () => {
        if (!wallet) return;
        await wallet.stagingFund(10);
        await refreshBalance();
    };

    return (
        <div className="qs-card qs-card--nested">
            <p className="qs-label">Balances</p>
            {TOKENS.map((token) => (
                <div key={token} className="qs-details__row">
                    <span className="qs-details__label">{token.toUpperCase()}</span>
                    <span className="qs-details__value">{balances[token] ?? "—"}</span>
                </div>
            ))}
            <div className="qs-flex qs-flex--gap-sm qs-mt-md">
                <button className="qs-btn qs-btn--primary" onClick={handleFund}>
                    Fund 10 USDXM
                </button>
                <button className="qs-btn qs-btn--secondary" onClick={refreshBalance}>
                    Refresh
                </button>
            </div>
        </div>
    );
}
