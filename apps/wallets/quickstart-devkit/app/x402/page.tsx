"use client";

import { useState } from "react";

export default function X402Page() {
    const [chain, setChain] = useState("solana");
    const [paymentUrl, setPaymentUrl] = useState("http://localhost:8402/protected");
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [walletLoading, setWalletLoading] = useState(false);
    const [walletError, setWalletError] = useState<string | null>(null);

    const [payStatus, setPayStatus] = useState<"idle" | "success" | "error">("idle");
    const [payLoading, setPayLoading] = useState(false);
    const [payError, setPayError] = useState<string | null>(null);

    async function handleCreateWallet() {
        setWalletLoading(true);
        setWalletError(null);
        try {
            const res = await fetch("/api/x402/wallet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chain }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error ?? "Failed to create wallet");
            }
            setWalletAddress(data.address);
        } catch (err: any) {
            setWalletError(err.message);
        } finally {
            setWalletLoading(false);
        }
    }

    async function handlePay() {
        if (!walletAddress) return;
        setPayLoading(true);
        setPayStatus("idle");
        setPayError(null);
        try {
            const res = await fetch("/api/x402/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ walletAddress, paymentUrl, chain }),
            });
            const data = await res.json();
            if (data.success) {
                setPayStatus("success");
            } else {
                setPayStatus("error");
                setPayError(data.error ?? "Payment failed");
            }
        } catch (err: any) {
            setPayStatus("error");
            setPayError(err.message);
        } finally {
            setPayLoading(false);
        }
    }

    const statusColor = payStatus === "success" ? "bg-green-500" : payStatus === "error" ? "bg-red-500" : "bg-gray-400";

    return (
        <div className="min-h-screen p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-8">X402 Payment Test Suite</h1>

            <section className="mb-8 space-y-4">
                <h2 className="text-lg font-semibold">Setup</h2>

                <div>
                    <label className="block text-sm font-medium mb-1">Chain</label>
                    <select
                        value={chain}
                        onChange={(e) => setChain(e.target.value)}
                        className="border rounded px-3 py-2 w-full"
                    >
                        <option value="solana">solana</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Payment URL</label>
                    <input
                        type="text"
                        value={paymentUrl}
                        onChange={(e) => setPaymentUrl(e.target.value)}
                        placeholder="https://..."
                        className="border rounded px-3 py-2 w-full"
                    />
                </div>

                <button
                    onClick={handleCreateWallet}
                    disabled={walletLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {walletLoading ? "Creating..." : "Create / Get Wallet"}
                </button>

                {walletAddress && (
                    <p className="text-sm">
                        Wallet address: <code className="bg-gray-100 px-1 rounded">{walletAddress}</code>
                    </p>
                )}
                {walletError && <p className="text-sm text-red-600">{walletError}</p>}
            </section>

            {walletAddress && (
                <section className="space-y-4">
                    <h2 className="text-lg font-semibold">Test Suite</h2>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handlePay}
                            disabled={payLoading}
                            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                        >
                            {payLoading ? "Paying..." : "farameter/corbits"}
                        </button>
                        <span className={`inline-block w-4 h-4 rounded-full ${statusColor}`} />
                    </div>

                    {payError && <p className="text-sm text-red-600">{payError}</p>}
                </section>
            )}
        </div>
    );
}
