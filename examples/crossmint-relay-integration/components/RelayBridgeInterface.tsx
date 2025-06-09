"use client";

import React, { useState, useCallback } from "react";
import { useCrossmintRelay } from "./CrossmintRelayProvider";
import { useWallet } from "@crossmint/client-sdk-react-ui";

interface RelayBridgeInterfaceProps {
    walletAddress: string;
}

const SUPPORTED_CHAINS = [
    { id: "ethereum", name: "Ethereum", symbol: "ETH" },
    { id: "polygon", name: "Polygon", symbol: "MATIC" },
    { id: "arbitrum", name: "Arbitrum", symbol: "ETH" },
    { id: "base", name: "Base", symbol: "ETH" },
];

const SUPPORTED_CURRENCIES = [
    { symbol: "ETH", name: "Ethereum" },
    { symbol: "USDC", name: "USD Coin" },
    { symbol: "USDT", name: "Tether" },
];

export function RelayBridgeInterface({ walletAddress }: RelayBridgeInterfaceProps) {
    const { getRelayQuote, executeRelayBridge, relayQuote } = useCrossmintRelay();
    const { wallet } = useWallet();
    
    const [fromChain, setFromChain] = useState("base");
    const [toChain, setToChain] = useState("polygon");
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState("ETH");
    const [recipient, setRecipient] = useState(walletAddress);
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionResult, setExecutionResult] = useState<string | null>(null);

    const handleGetQuote = useCallback(async () => {
        if (!amount || !recipient) {
            alert("Please fill in all fields");
            return;
        }

        try {
            await getRelayQuote({
                fromChain,
                toChain,
                amount,
                currency,
                recipient,
            });
        } catch (error) {
            console.error("Failed to get quote:", error);
            alert("Failed to get quote. Please try again.");
        }
    }, [fromChain, toChain, amount, currency, recipient, getRelayQuote]);

    const handleExecuteBridge = useCallback(async () => {
        if (!relayQuote.quote) {
            alert("No quote available");
            return;
        }

        setIsExecuting(true);
        setExecutionResult(null);

        try {
            const txHash = await executeRelayBridge(relayQuote.quote);
            setExecutionResult(txHash);
        } catch (error) {
            console.error("Failed to execute bridge:", error);
            alert("Failed to execute bridge. Please try again.");
        } finally {
            setIsExecuting(false);
        }
    }, [relayQuote.quote, executeRelayBridge]);

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                Instant Bridge with Relay
            </h2>

            <div className="space-y-4">
                {/* From Chain */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        From Chain
                    </label>
                    <select
                        value={fromChain}
                        onChange={(e) => setFromChain(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        {SUPPORTED_CHAINS.map((chain) => (
                            <option key={chain.id} value={chain.id}>
                                {chain.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* To Chain */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        To Chain
                    </label>
                    <select
                        value={toChain}
                        onChange={(e) => setToChain(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        {SUPPORTED_CHAINS.filter(chain => chain.id !== fromChain).map((chain) => (
                            <option key={chain.id} value={chain.id}>
                                {chain.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Currency */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                    </label>
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        {SUPPORTED_CURRENCIES.map((curr) => (
                            <option key={curr.symbol} value={curr.symbol}>
                                {curr.name} ({curr.symbol})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount
                    </label>
                    <input
                        type="number"
                        step="0.001"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.1"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Recipient */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recipient Address
                    </label>
                    <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="0x..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                </div>

                {/* Get Quote Button */}
                <button
                    onClick={handleGetQuote}
                    disabled={relayQuote.loading || !amount || !recipient}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    {relayQuote.loading ? "Getting Quote..." : "Get Quote"}
                </button>

                {/* Quote Display */}
                {relayQuote.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm">{relayQuote.error}</p>
                    </div>
                )}

                {relayQuote.quote && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h3 className="font-semibold text-green-800 mb-2">Quote Ready</h3>
                        <div className="text-sm text-green-700 space-y-1">
                            <p>From: {fromChain} → {toChain}</p>
                            <p>Amount: {amount} {currency}</p>
                            <p>Estimated Time: 1-10 seconds</p>
                        </div>
                        
                        <button
                            onClick={handleExecuteBridge}
                            disabled={isExecuting}
                            className="w-full mt-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {isExecuting ? "Executing Bridge..." : "Execute Bridge"}
                        </button>
                    </div>
                )}

                {/* Execution Result */}
                {executionResult && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="font-semibold text-blue-800 mb-2">Bridge Executed!</h3>
                        <p className="text-sm text-blue-700">Transaction Hash:</p>
                        <p className="font-mono text-xs bg-blue-100 p-2 rounded break-all">
                            {executionResult}
                        </p>
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">How it Works</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Your Crossmint wallet handles all signing</li>
                    <li>• Relay provides instant cross-chain bridging</li>
                    <li>• No external wallet connections needed</li>
                    <li>• Low fees and fast execution (1-10 seconds)</li>
                </ul>
            </div>
        </div>
    );
}
