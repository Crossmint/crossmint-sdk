"use client";

import { useWallet } from "@crossmint/client-sdk-react-ui";
import { useState } from "react";

export function ApprovalTest() {
    const { wallet } = useWallet();
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [token, setToken] = useState("usdxm");
    const [pendingTxId, setPendingTxId] = useState("");
    const [approveId, setApproveId] = useState("");
    const [result, setResult] = useState("");

    const prepareTx = async () => {
        if (!wallet || !recipient || !amount) return;
        const res = await wallet.send(recipient, token, amount, { prepareOnly: true });
        setPendingTxId(res.transactionId ?? JSON.stringify(res));
        setResult("Prepared: " + JSON.stringify(res));
    };

    const approveTx = async () => {
        if (!wallet || !approveId) return;
        const res = await wallet.approve({ transactionId: approveId });
        setResult("Approved: " + JSON.stringify(res));
    };

    const approveSig = async () => {
        if (!wallet || !approveId) return;
        const res = await wallet.approve({ signatureId: approveId });
        setResult("Approved sig: " + JSON.stringify(res));
    };

    return (
        <div className="qs-card qs-card--nested">
            <p className="qs-label">Approval Test</p>
            <input
                className="qs-input qs-mt-sm"
                placeholder="Recipient"
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
                className="qs-btn qs-btn--secondary qs-btn--full qs-mt-sm"
                onClick={prepareTx}
                disabled={!recipient || !amount}
            >
                Prepare Transaction
            </button>
            {pendingTxId && (
                <p className="qs-text-muted qs-mt-sm" style={{ fontSize: 12, wordBreak: "break-all" }}>
                    TX ID: {pendingTxId}
                </p>
            )}
            <hr style={{ margin: "12px 0", border: "none", borderTop: "1px solid #E5E7EB" }} />
            <input
                className="qs-input"
                placeholder="Transaction or Signature ID"
                value={approveId}
                onChange={(e) => setApproveId(e.target.value)}
            />
            <div className="qs-flex qs-flex--gap-sm qs-mt-sm">
                <button className="qs-btn qs-btn--primary" onClick={approveTx} disabled={!approveId}>
                    Approve TX
                </button>
                <button className="qs-btn qs-btn--secondary" onClick={approveSig} disabled={!approveId}>
                    Approve Sig
                </button>
            </div>
            {result && (
                <pre
                    className="qs-mt-sm"
                    style={{
                        fontSize: 11,
                        maxHeight: 100,
                        overflow: "auto",
                        background: "#F7F8FA",
                        padding: 8,
                        borderRadius: 6,
                        wordBreak: "break-all",
                        whiteSpace: "pre-wrap",
                    }}
                >
                    {result}
                </pre>
            )}
        </div>
    );
}
