"use client";

import { useWallet } from "@crossmint/client-sdk-react-ui";
import { useState } from "react";

const TOKENS = ["usdxm", "usdc"];

export function TransferForm() {
    const { wallet } = useWallet();
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [token, setToken] = useState(TOKENS[0]);
    const [txExplorerLink, setTxExplorerLink] = useState("");

    const handleTransfer = async () => {
        if (!wallet || !recipient || !amount) return;
        const { explorerLink } = await wallet.send(recipient, token, amount);
        setTxExplorerLink(explorerLink);
        setRecipient("");
        setAmount("");
    };

    return (
        <div className="qs-card qs-card--nested">
            <p className="qs-label">Transfer Funds</p>
            <select className="qs-input qs-mt-sm" value={token} onChange={(e) => setToken(e.target.value)}>
                {TOKENS.map((t) => (
                    <option key={t} value={t}>
                        {t.toUpperCase()}
                    </option>
                ))}
            </select>
            <input
                className="qs-input qs-mt-sm"
                placeholder="Recipient address"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
            />
            <input
                className="qs-input qs-mt-sm"
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
            />
            <button
                className="qs-btn qs-btn--primary qs-btn--full qs-mt-md"
                onClick={handleTransfer}
                disabled={!recipient || !amount}
            >
                Transfer
            </button>
            {txExplorerLink && (
                <a className="qs-tx-link" href={txExplorerLink} target="_blank" rel="noopener noreferrer">
                    View transaction
                </a>
            )}
        </div>
    );
}
