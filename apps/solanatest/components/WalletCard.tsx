import { useState } from "react";
import type {
    SolanaMPCWallet,
    SolanaSmartWallet,
} from "@crossmint/wallets-sdk";
import {
    addDelegatedSigner,
    createWallet,
    sendTransaction,
    type WalletType,
} from "../services/walletService";

interface WalletCardProps {
    title: string;
    subtitle?: string;
    type: WalletType;
}

export default function WalletCard({ title, subtitle, type }: WalletCardProps) {
    const [wallet, setWallet] = useState<
        SolanaSmartWallet | SolanaMPCWallet | null
    >(null);
    const [delegatedSigner, setDelegatedSigner] = useState<
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        any | null
    >(null);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [adminSignerAddress, setAdminSignerAddress] = useState<string | null>(
        null
    );
    const [delegatedSignerAddress, setDelegatedSignerAddress] = useState<
        string | null
    >(null);
    const [txId, setTxId] = useState<string | null>(null);
    const [delegatedSignerTxId, setDelegatedSignerTxId] = useState<
        string | null
    >(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingAddDelegatedSigner, setIsLoadingAddDelegatedSigner] =
        useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSigner, setSelectedSigner] = useState<
        "admin" | "delegated" | null
    >(null);

    const handleCreateWallet = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const newWallet = await createWallet(type);
            setWallet(newWallet);
            if (type === "smart-non-custodial") {
                const address = (
                    newWallet as SolanaSmartWallet
                ).getAdminSigner().address;
                if (address != null) {
                    setAdminSignerAddress(address);
                }
            }

            const address = await newWallet.getAddress();
            setWalletAddress(address);
        } catch (err) {
            console.error(`Error creating ${type} wallet:`, err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendTransaction = async () => {
        if (!wallet) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const message = `Hello from Crossmint SDK ${
                type === "smart" ? "Smart" : "MPC"
            } Wallet!`;
            const transactionId = await sendTransaction(
                wallet,
                message,
                selectedSigner === "delegated" ? delegatedSigner : null
            );
            setTxId(transactionId);
        } catch (err) {
            console.error(`Error sending ${type} wallet transaction:`, err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
            setIsModalOpen(false);
            setSelectedSigner(null);
        }
    };

    const handleAddDelegatedSigner = async () => {
        if (!wallet) {
            return;
        }

        setIsLoadingAddDelegatedSigner(true);
        setError(null);

        try {
            const { signer, response } = (await addDelegatedSigner(
                wallet as SolanaSmartWallet
            )) as any;
            setDelegatedSignerAddress(response.address);
            setDelegatedSignerTxId(response.transaction.onChain.txId);
            setDelegatedSigner(signer);
        } catch (err) {
            console.error(`Error adding delegated signer:`, err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoadingAddDelegatedSigner(false);
        }
    };

    const openTransactionModal = () => {
        if (delegatedSigner) {
            setIsModalOpen(true);
        } else {
            handleSendTransaction();
        }
    };

    return (
        <div className="w-full max-w-9xl p-8 bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20">
            <h1 className="text-3xl font-bold mb-2 text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-purple-300">
                {title}
            </h1>

            <div className="h-10 flex items-center justify-center mb-2">
                {subtitle ? (
                    <p className="text-center text-gray-300 px-4 text-sm italic font-light max-w-[90%] bg-clip-text text-transparent bg-gradient-to-r from-gray-300 to-blue-200">
                        {subtitle}
                    </p>
                ) : (
                    <div className="h-6"></div> // Empty space for consistent layout
                )}
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg">
                    <p className="font-bold text-red-100">Error:</p>
                    <p className="break-words text-sm">{error}</p>
                </div>
            )}

            {!wallet ? (
                <button
                    onClick={handleCreateWallet}
                    disabled={isLoading}
                    className={`w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all transform hover:scale-[1.02] ${
                        isLoading ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                >
                    {isLoading ? (
                        <LoadingSpinner text="Creating Wallet..." />
                    ) : (
                        `Create ${
                            type === "smart" || type === "smart-non-custodial"
                                ? "Smart"
                                : "MPC"
                        } Wallet`
                    )}
                </button>
            ) : (
                <div className="flex flex-col items-center space-y-6">
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <h2 className="text-xl font-bold text-green-300">
                            Wallet Active
                        </h2>
                    </div>

                    <div className="w-full p-4 bg-white/5 border border-white/10 rounded-lg">
                        <p className="text-xs text-gray-300 mb-1">
                            Wallet Address
                        </p>
                        <p className="font-mono text-sm break-all text-cyan-200">
                            {walletAddress}
                        </p>
                    </div>

                    {(adminSignerAddress != null ||
                        delegatedSignerAddress != null) && (
                        <div className="w-full p-4 bg-white/5 border border-white/10 rounded-lg shadow-inner hover:bg-white/8 transition-colors">
                            {adminSignerAddress && (
                                <div
                                    className={
                                        delegatedSignerAddress
                                            ? "mb-3 border-b border-white/10 pb-3"
                                            : ""
                                    }
                                >
                                    <p className="text-xs text-gray-300 mb-1 font-medium">
                                        Admin Signer Address
                                    </p>
                                    <p className="font-mono text-sm break-all text-purple-200 bg-black/20 p-2 rounded">
                                        {adminSignerAddress}
                                    </p>
                                </div>
                            )}
                            {delegatedSignerAddress && (
                                <div>
                                    <p className="text-xs text-gray-300 mb-1 font-medium">
                                        Delegated Signer Address
                                    </p>
                                    <p className="font-mono text-sm break-all text-purple-200 bg-black/20 p-2 rounded">
                                        {delegatedSignerAddress}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        onClick={openTransactionModal}
                        disabled={isLoading}
                        className={`w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-medium shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all transform hover:scale-[1.02] ${
                            isLoading ? "opacity-70 cursor-not-allowed" : ""
                        }`}
                    >
                        {isLoading ? (
                            <LoadingSpinner text="Processing..." />
                        ) : (
                            "Send Transaction"
                        )}
                    </button>

                    {type !== "mpc" && (
                        <button
                            onClick={handleAddDelegatedSigner}
                            disabled={isLoadingAddDelegatedSigner}
                            className={`w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-medium shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all transform hover:scale-[1.02] ${
                                isLoading ? "opacity-70 cursor-not-allowed" : ""
                            }`}
                        >
                            {isLoadingAddDelegatedSigner ? (
                                <LoadingSpinner text="Processing..." />
                            ) : (
                                "Add Delegated Signer"
                            )}
                        </button>
                    )}

                    {txId && delegatedSignerTxId && type !== "mpc" ? (
                        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                            <TransactionSuccess
                                txId={txId}
                                title="Transaction Success!"
                            />
                            <TransactionSuccess
                                txId={delegatedSignerTxId}
                                title="Delegated Signer Added!"
                            />
                        </div>
                    ) : (
                        <>
                            {txId && (
                                <TransactionSuccess
                                    txId={txId}
                                    title="Transaction Success!"
                                />
                            )}
                            {delegatedSignerTxId && type !== "mpc" && (
                                <TransactionSuccess
                                    txId={delegatedSignerTxId}
                                    title="Delegated Signer Added!"
                                />
                            )}
                        </>
                    )}

                    {isModalOpen && delegatedSigner && (
                        <SignerSelectionModal
                            onClose={() => setIsModalOpen(false)}
                            onSelectSigner={(signer: "admin" | "delegated") => {
                                setSelectedSigner(signer);
                                handleSendTransaction();
                            }}
                            adminSignerAddress={adminSignerAddress}
                            delegatedSignerAddress={delegatedSignerAddress}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

function LoadingSpinner({ text }: { text: string }) {
    return (
        <span className="flex items-center justify-center">
            <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
            >
                <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                ></circle>
                <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
            </svg>
            {text}
        </span>
    );
}

function TransactionSuccess({ txId, title }: { txId: string; title: string }) {
    return (
        <div className="w-full mt-4 p-5 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center mb-3">
                <svg
                    className="w-5 h-5 text-green-400 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                    ></path>
                </svg>
                <p className="font-bold text-green-300">{title}</p>
            </div>
            <p className="text-xs text-gray-300 mb-1">Transaction ID</p>
            <p className="font-mono text-xs break-all text-cyan-200 mb-3">
                {txId}
            </p>
            <a
                href={`https://explorer.solana.com/tx/${txId}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full py-2 bg-white/10 hover:bg-white/20 rounded-md text-sm text-white transition-colors"
            >
                <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    ></path>
                </svg>
                View on Solana Explorer
            </a>
        </div>
    );
}

function SignerSelectionModal({
    onClose,
    onSelectSigner,
    adminSignerAddress,
    delegatedSignerAddress,
}: {
    onClose: () => void;
    onSelectSigner: (signer: "admin" | "delegated") => void;
    adminSignerAddress: string | null;
    delegatedSignerAddress: string | null;
}) {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-white/20 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4">
                    Choose Signer
                </h3>
                <p className="text-gray-300 mb-6">
                    Select which signer to use for this transaction:
                </p>

                <div className="space-y-4 mb-6">
                    <button
                        onClick={() => {
                            onSelectSigner("admin");
                            onClose();
                        }}
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors flex items-start"
                    >
                        <div className="flex-1">
                            <p className="font-medium text-white mb-1">
                                Admin Signer
                            </p>
                            <p className="font-mono text-xs break-all text-cyan-200">
                                {adminSignerAddress}
                            </p>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            onSelectSigner("delegated");
                            onClose();
                        }}
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors flex items-start"
                    >
                        <div className="flex-1">
                            <p className="font-medium text-white mb-1">
                                Delegated Signer
                            </p>
                            <p className="font-mono text-xs break-all text-cyan-200">
                                {delegatedSignerAddress}
                            </p>
                        </div>
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
