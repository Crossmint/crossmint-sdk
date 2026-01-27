"use client";

import { useState } from "react";
import { type Signature, type Transaction, useWallet } from "@crossmint/client-sdk-react-ui";
import { PublicKey } from "@solana/web3.js";
import { isAddress } from "viem";

export function ApprovalTest() {
    const { wallet } = useWallet();

    const isEVMWallet = wallet?.chain !== "solana";
    const isSolanaWallet = wallet?.chain === "solana";

    // State for creating transactions that need approval
    const [prepareTransfer, setPrepareTransfer] = useState({
        token: (isEVMWallet ? "eth" : "sol") as "eth" | "usdc" | "sol" | "usdxm",
        recipient: "",
        amount: "",
    });
    const [preparedTransactionId, setPreparedTransactionId] = useState<string | null>(null);

    // State for manual approval testing
    const [manualTransactionId, setManualTransactionId] = useState("");
    const [manualSignatureId, setManualSignatureId] = useState("");

    // Loading and result states
    const [isCreatingTransaction, setIsCreatingTransaction] = useState(false);
    const [isApprovingTransaction, setIsApprovingTransaction] = useState(false);
    const [isApprovingSignature, setIsApprovingSignature] = useState(false);
    const [approvalResult, setApprovalResult] = useState<Transaction<false> | Signature<false> | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Validate address based on chain
    const isValidAddress = (address: string) => {
        if (isEVMWallet) {
            return isAddress(address);
        } else if (isSolanaWallet) {
            try {
                new PublicKey(address);
                return true;
            } catch {
                return false;
            }
        }
        return false;
    };

    // Create a transaction that needs approval (prepare only)
    const handleCreatePreparedTransaction = async () => {
        if (!wallet || !prepareTransfer.recipient || !prepareTransfer.amount) {
            setError("Missing required fields for creating prepared transaction");
            return;
        }

        if (!isValidAddress(prepareTransfer.recipient)) {
            setError("Invalid recipient address");
            return;
        }

        // const evmWallet = EVMWallet.from(wallet);
        // const txn = await evmWallet.sendTransaction({
        //     transaction: "0x",
        //     options: { experimental_prepareOnly: true },
        // });

        // const sigSigned = await evmWallet.signTypedData({
        //     chain: "apechain",
        //     types: {
        //         EIP712Domain: [
        //             { name: "name", type: "string" },
        //             { name: "version", type: "string" },
        //             { name: "chainId", type: "uint256" },
        //             { name: "verifyingContract", type: "address" },
        //         ],
        //     },
        //     domain: {
        //         name: "Test",
        //         version: "1",
        //         chainId: BigInt(1),
        //         verifyingContract: "0x0000000000000000000000000000000000000000",
        //     },
        //     primaryType: "EIP712Domain",
        //     message: {
        //         name: "Test",
        //         version: "1",
        //         chainId: BigInt(1),
        //         verifyingContract: "0x0000000000000000000000000000000000000000",
        //     },
        //     options: { experimental_prepareOnly: false },
        // });

        // const sigMessage = await evmWallet.signMessage({
        //     message: "Hello, world!",
        //     options: { experimental_prepareOnly: true },
        // });

        try {
            setIsCreatingTransaction(true);
            setError(null);

            // Create transaction with prepareOnly option
            const transaction = await wallet.send(
                prepareTransfer.recipient,
                prepareTransfer.token,
                prepareTransfer.amount,
                { experimental_prepareOnly: true }
            );

            setPreparedTransactionId(transaction.transactionId);
            setApprovalResult(null);
        } catch (err: any) {
            console.error("Failed to create prepared transaction:", err);
            setError(`Failed to create transaction: ${err.message || err}`);
        } finally {
            setIsCreatingTransaction(false);
        }
    };

    // Approve a transaction by ID
    const handleApproveTransaction = async (transactionId: string) => {
        if (!wallet || !transactionId) {
            setError("Missing wallet or transaction ID");
            return;
        }

        try {
            setIsApprovingTransaction(true);
            setError(null);

            const result = await wallet.approve({ transactionId });
            setApprovalResult(result);
        } catch (err: any) {
            console.error("Failed to approve transaction:", err);
            setError(`Failed to approve transaction: ${err.message || err}`);
        } finally {
            setIsApprovingTransaction(false);
        }
    };

    // Approve a signature by ID
    const handleApproveSignature = async () => {
        if (!wallet || !manualSignatureId) {
            setError("Missing wallet or signature ID");
            return;
        }

        try {
            setIsApprovingSignature(true);
            setError(null);

            const result = await wallet.approve({ signatureId: manualSignatureId });

            setApprovalResult(result);
        } catch (err: any) {
            console.error("Failed to approve signature:", err);
            setError(`Failed to approve signature: ${err.message || err}`);
        } finally {
            setIsApprovingSignature(false);
        }
    };

    // Reset all state
    const handleReset = () => {
        setPreparedTransactionId(null);
        setApprovalResult(null);
        setError(null);
        setManualTransactionId("");
        setManualSignatureId("");
    };

    return (
        <div className="bg-white flex flex-col gap-6 rounded-xl border shadow-sm p-6">
            <div>
                <h2 className="text-lg font-medium">Approval Method Test</h2>
                <p className="text-sm text-gray-500">
                    Test the approve() method with both transaction ID and signature ID
                </p>
                <p className="text-xs text-blue-600 mt-1">
                    Chain: {wallet?.chain || "Not connected"} | Address: {wallet?.address || "N/A"}
                </p>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Section 1: Create Prepared Transaction */}
            <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">1. Create Transaction (Prepare Only)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                        <label className="text-sm font-medium block mb-1">Token</label>
                        <select
                            value={prepareTransfer.token}
                            onChange={(e) =>
                                setPrepareTransfer((prev) => ({
                                    ...prev,
                                    token: e.target.value as "eth" | "usdc" | "sol" | "usdxm",
                                }))
                            }
                            className="w-full px-3 py-2 border rounded-md text-sm"
                        >
                            {isEVMWallet && <option value="eth">ETH</option>}
                            {isSolanaWallet && <option value="sol">SOL</option>}
                            <option value="usdc">USDC</option>
                            <option value="usdxm">USDXM</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium block mb-1">Amount</label>
                        <input
                            type="number"
                            step="0.000001"
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            placeholder="0.001"
                            value={prepareTransfer.amount}
                            onChange={(e) =>
                                setPrepareTransfer((prev) => ({
                                    ...prev,
                                    amount: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium block mb-1">Recipient</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            placeholder={isEVMWallet ? "0x..." : "Base58 address"}
                            value={prepareTransfer.recipient}
                            onChange={(e) =>
                                setPrepareTransfer((prev) => ({
                                    ...prev,
                                    recipient: e.target.value,
                                }))
                            }
                        />
                    </div>
                </div>
                <button
                    onClick={handleCreatePreparedTransaction}
                    disabled={isCreatingTransaction}
                    className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        isCreatingTransaction
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                >
                    {isCreatingTransaction ? "Creating..." : "Create Prepared Transaction"}
                </button>

                {preparedTransactionId && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-700">
                            <strong>Prepared Transaction ID:</strong> {preparedTransactionId}
                        </p>
                    </div>
                )}
            </div>

            {/* Section 2: Approve Transaction */}
            <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">2. Approve Transaction by ID</h3>
                <div className="flex gap-3 mb-3">
                    <input
                        type="text"
                        className="flex-1 px-3 py-2 border rounded-md text-sm"
                        placeholder="Enter transaction ID or use prepared one above"
                        value={manualTransactionId}
                        onChange={(e) => setManualTransactionId(e.target.value)}
                    />
                    {preparedTransactionId && (
                        <button
                            onClick={() => setManualTransactionId(preparedTransactionId)}
                            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
                        >
                            Use Prepared
                        </button>
                    )}
                </div>
                <button
                    onClick={() => handleApproveTransaction(manualTransactionId)}
                    disabled={isApprovingTransaction || !manualTransactionId}
                    className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        isApprovingTransaction || !manualTransactionId
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                >
                    {isApprovingTransaction ? "Approving Transaction..." : "Approve Transaction"}
                </button>
            </div>

            {/* Section 3: Approve Signature */}
            <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">3. Approve Signature by ID</h3>
                <p className="text-xs text-gray-500 mb-3">
                    Note: Signatures are mainly used for EVM smart wallets. You'll need a signature ID from another
                    process.
                </p>
                <div className="flex gap-3 mb-3">
                    <input
                        type="text"
                        className="flex-1 px-3 py-2 border rounded-md text-sm"
                        placeholder="Enter signature ID"
                        value={manualSignatureId}
                        onChange={(e) => setManualSignatureId(e.target.value)}
                    />
                </div>
                <button
                    onClick={handleApproveSignature}
                    disabled={isApprovingSignature || !manualSignatureId}
                    className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        isApprovingSignature || !manualSignatureId
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-purple-600 text-white hover:bg-purple-700"
                    }`}
                >
                    {isApprovingSignature ? "Approving Signature..." : "Approve Signature"}
                </button>
            </div>

            {/* Results Display */}
            {approvalResult != null && (
                <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="font-medium mb-3">Approval Result</h3>
                    <div className="space-y-2">
                        <p className="text-sm">
                            <strong>Type:</strong> {"transactionId" in approvalResult ? "Transaction" : "Signature"}
                        </p>
                        <p className="text-sm">
                            <strong>ID:</strong>{" "}
                            {"transactionId" in approvalResult
                                ? approvalResult.transactionId
                                : approvalResult.signatureId}
                        </p>
                        <div className="text-sm">
                            <strong>Result:</strong>
                            <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                                {JSON.stringify(approvalResult, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Button */}
            <button
                onClick={handleReset}
                className="w-full py-2 px-4 rounded-md text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors"
            >
                Reset All
            </button>
        </div>
    );
}
