"use client";

import { useState } from "react";
import { useWallet } from "@crossmint/client-sdk-react-ui";
import { PublicKey } from "@solana/web3.js";
import { isAddress } from "viem";

const isEmailValid = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const isValidXHandle = (handle: string): boolean => {
    // X handles should start with @ and contain only alphanumeric characters and underscores
    // Length between 1 and 15 characters (excluding @)
    const xHandleRegex = /^@?[A-Za-z0-9_]{1,15}$/;
    return xHandleRegex.test(handle);
};

/* ============================================================ */
/*                    RECIPIENT SELECTOR COMPONENT              */
/* ============================================================ */
type RecipientType = "address" | "email" | "x";

interface RecipientSelectorProps {
    recipientType: RecipientType;
    setRecipientType: (type: RecipientType) => void;
    setRecipient: (value: string | null) => void;
    name: string;
    addressPlaceholder?: string;
    testId?: string;
}

function RecipientSelector({
    recipientType,
    setRecipientType,
    setRecipient,
    name,
    addressPlaceholder = "Enter wallet address",
    testId = "recipient-wallet-address",
}: RecipientSelectorProps) {
    const getLabel = () => {
        switch (recipientType) {
            case "address":
                return "Recipient wallet";
            case "email":
                return "Recipient email";
            case "x":
                return "Recipient X handle";
        }
    };

    const getPlaceholder = () => {
        switch (recipientType) {
            case "address":
                return addressPlaceholder;
            case "email":
                return "Enter email address";
            case "x":
                return "Enter X handle";
        }
    };

    return (
        <>
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Recipient type</label>
                <div className="flex gap-3">
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            type="radio"
                            name={name}
                            className="h-4 w-4"
                            checked={recipientType === "address"}
                            onChange={() => setRecipientType("address")}
                        />
                        <span>Wallet Address</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            type="radio"
                            name={name}
                            className="h-4 w-4"
                            checked={recipientType === "email"}
                            onChange={() => setRecipientType("email")}
                        />
                        <span>Email</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            type="radio"
                            name={name}
                            className="h-4 w-4"
                            checked={recipientType === "x"}
                            onChange={() => setRecipientType("x")}
                        />
                        <span>X Handle</span>
                    </label>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">{getLabel()}</label>
                <input
                    type="text"
                    data-testid={testId}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholder={getPlaceholder()}
                    onChange={(e) => setRecipient(e.target.value)}
                />
            </div>
        </>
    );
}

/* ============================================================ */
/*                    EVM WALLET TRANSFER                        */
/* ============================================================ */
export function EVMTransferFunds() {
    const { wallet } = useWallet();
    const [token, setToken] = useState<"eth" | "usdc" | null>(null);
    const [recipientType, setRecipientType] = useState<"address" | "email" | "x">("address");
    const [recipient, setRecipient] = useState<string | null>(null);
    const [amount, setAmount] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [txLink, setTxLink] = useState<string | null>(null);

    async function handleOnTransfer() {
        if (wallet == null || token == null || recipient == null || amount == null) {
            alert("Transfer: missing required fields");
            return;
        }

        // Validate recipient based on type
        if (recipientType === "address" && !isAddress(recipient)) {
            alert("Transfer: Invalid recipient address");
            return;
        }

        if (recipientType === "email" && !isEmailValid(recipient)) {
            alert("Transfer: Invalid email address");
            return;
        }

        if (recipientType === "x" && !isValidXHandle(recipient)) {
            alert("Transfer: Invalid X handle");
            return;
        }

        try {
            setIsLoading(true);
            // Prepare recipient based on type
            const recipientParam =
                recipientType === "email" ? { email: recipient } : recipientType === "x" ? { x: recipient } : recipient;
            const tx = await wallet.send(recipientParam, token, amount.toString());
            setTxLink(tx.explorerLink);
        } catch (err) {
            console.error("Transfer: ", err);
            alert("Transfer: " + err);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="bg-white flex flex-col gap-3 rounded-xl border shadow-sm p-5">
            <div>
                <h2 className="text-lg font-medium">Transfer funds</h2>
                <p className="text-sm text-gray-500">Send funds to another wallet</p>
            </div>
            <div className="flex flex-col gap-3 w-full">
                <div className="flex gap-4">
                    <div className="flex flex-col gap-2 flex-1">
                        <label className="text-sm font-medium">Token</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="eth"
                                    className="h-4 w-4"
                                    checked={token === "eth"}
                                    onChange={() => setToken("eth")}
                                />
                                <span>ETH</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="usdc"
                                    className="h-4 w-4"
                                    checked={token === "usdc"}
                                    onChange={() => setToken("usdc")}
                                />
                                <span>USDC</span>
                            </label>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                        <label className="text-sm font-medium">Amount</label>
                        <input
                            type="number"
                            data-testid="amount"
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            placeholder="0.00"
                            onChange={(e) => setAmount(Number(e.target.value))}
                        />
                    </div>
                </div>
                <RecipientSelector
                    recipientType={recipientType}
                    setRecipientType={setRecipientType}
                    setRecipient={setRecipient}
                    name="evm-recipient-type"
                />
            </div>
            <div className="flex flex-col gap-2 w-full">
                <button
                    className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        isLoading
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-accent text-white hover:bg-accent/80"
                    }`}
                    data-testid="transfer-button"
                    onClick={handleOnTransfer}
                    disabled={isLoading}
                >
                    {isLoading ? "Transferring..." : "Transfer"}
                </button>
                {txLink != null && !isLoading && (
                    <a
                        href={txLink}
                        data-testid="successful-tx-link"
                        className="text-sm text-gray-500 text-center"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        → View on Explorer (refresh to update balance)
                    </a>
                )}
            </div>
        </div>
    );
}

/* ============================================================ */
/*                    SOLANA WALLET TRANSFER                    */
/* ============================================================ */
export function SolanaTransferFunds() {
    const { wallet } = useWallet();
    const [token, setToken] = useState<"sol" | "usdc" | null>("sol");
    const [recipientType, setRecipientType] = useState<"address" | "email" | "x">("address");
    const [recipient, setRecipient] = useState<string | null>(null);
    const [amount, setAmount] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [txLink, setTxLink] = useState<string | null>(null);

    const isSolanaAddressValid = (address: string) => {
        try {
            new PublicKey(address);
            return true;
        } catch {
            return false;
        }
    };

    async function handleOnTransfer() {
        if (wallet == null || token == null || recipient == null || amount == null) {
            alert("Transfer: missing required fields");
            return;
        }

        // Validate recipient based on type
        if (recipientType === "address" && token === "sol" && !isSolanaAddressValid(recipient)) {
            alert("Transfer: Invalid Solana recipient address");
            return;
        }

        if (recipientType === "email" && !isEmailValid(recipient)) {
            alert("Transfer: Invalid email address");
            return;
        }

        if (recipientType === "x" && !isValidXHandle(recipient)) {
            alert("Transfer: Invalid X handle");
            return;
        }

        try {
            setIsLoading(true);
            // Prepare recipient based on type
            const recipientParam =
                recipientType === "email" ? { email: recipient } : recipientType === "x" ? { x: recipient } : recipient;
            const tx = await wallet.send(recipientParam, token, amount.toString());
            setTxLink(tx.explorerLink);
        } catch (err) {
            console.error("Transfer: ", err);
            alert("Transfer: " + err);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="bg-white flex flex-col gap-3 rounded-xl border shadow-sm p-5">
            <div>
                <h2 className="text-lg font-medium">Transfer funds</h2>
                <p className="text-sm text-gray-500">Send funds to another wallet</p>
            </div>
            <div className="flex flex-col gap-3 w-full">
                <div className="flex gap-4">
                    <div className="flex flex-col gap-2 flex-1">
                        <label className="text-sm font-medium">Token</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="token"
                                    className="h-4 w-4"
                                    checked={token === "usdc"}
                                    onChange={() => setToken("usdc")}
                                />
                                <span>USDC</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="token"
                                    className="h-4 w-4"
                                    checked={token === "sol"}
                                    onChange={() => setToken("sol")}
                                />
                                <span>SOL</span>
                            </label>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                        <label className="text-sm font-medium">Amount</label>
                        <input
                            type="number"
                            data-testid="amount"
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            placeholder="0.00"
                            onChange={(e) => setAmount(Number(e.target.value))}
                        />
                    </div>
                </div>
                <RecipientSelector
                    recipientType={recipientType}
                    setRecipientType={setRecipientType}
                    setRecipient={setRecipient}
                    name="solana-recipient-type"
                />
            </div>
            <div className="flex flex-col gap-2 w-full">
                <button
                    className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        isLoading
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-accent text-white hover:bg-accent/80"
                    }`}
                    data-testid="transfer-button"
                    onClick={handleOnTransfer}
                    disabled={isLoading}
                >
                    {isLoading ? "Transferring..." : "Transfer"}
                </button>
                {txLink != null && !isLoading && (
                    <a
                        href={txLink}
                        data-testid="successful-tx-link"
                        className="text-sm text-gray-500 text-center"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        → View on Solscan (refresh to update balance)
                    </a>
                )}
            </div>
        </div>
    );
}

/* ============================================================ */
/*                    STELLAR WALLET TRANSFER                   */
/* ============================================================ */
export function StellarTransferFunds() {
    const { wallet } = useWallet();
    const [token, setToken] = useState<"xlm" | "usdc" | "usdxm" | null>("xlm");
    const [recipientType, setRecipientType] = useState<"address" | "email" | "x">("address");
    const [recipient, setRecipient] = useState<string | null>(null);
    const [amount, setAmount] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [txLink, setTxLink] = useState<string | null>(null);

    async function handleOnTransfer() {
        if (wallet == null || token == null || recipient == null || amount == null) {
            alert("Transfer: missing required fields");
            return;
        }

        const isStellarAddressValid = (address: string) => /^[G|C][A-Z0-9]{55}$/.test(address);

        // Validate recipient based on type
        if (recipientType === "address" && !isStellarAddressValid(recipient)) {
            alert("Transfer: Invalid Stellar recipient address");
            return;
        }

        if (recipientType === "email" && !isEmailValid(recipient)) {
            alert("Transfer: Invalid email address");
            return;
        }

        if (recipientType === "x" && !isValidXHandle(recipient)) {
            alert("Transfer: Invalid X handle");
            return;
        }

        try {
            setIsLoading(true);
            // Prepare recipient based on type
            const recipientParam =
                recipientType === "email" ? { email: recipient } : recipientType === "x" ? { x: recipient } : recipient;
            const tx = await wallet.send(recipientParam, token, amount.toString());
            setTxLink(tx.explorerLink);
        } catch (err) {
            console.error("Transfer: ", err);
            alert("Transfer: " + err);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="bg-white flex flex-col gap-3 rounded-xl border shadow-sm p-5">
            <div>
                <h2 className="text-lg font-medium">Transfer funds</h2>
                <p className="text-sm text-gray-500">Send funds to another wallet</p>
            </div>
            <div className="flex flex-col gap-3 w-full">
                <div className="flex gap-4">
                    <div className="flex flex-col gap-2 flex-1">
                        <label className="text-sm font-medium">Token</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="token"
                                    className="h-4 w-4"
                                    checked={token === "usdxm"}
                                    onChange={() => setToken("usdxm")}
                                />
                                <span>USDXM</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="token"
                                    className="h-4 w-4"
                                    checked={token === "xlm"}
                                    onChange={() => setToken("xlm")}
                                />
                                <span>XLM</span>
                            </label>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                        <label className="text-sm font-medium">Amount</label>
                        <input
                            type="number"
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            placeholder="0.00"
                            onChange={(e) => setAmount(Number(e.target.value))}
                        />
                    </div>
                </div>
                <RecipientSelector
                    recipientType={recipientType}
                    setRecipientType={setRecipientType}
                    setRecipient={setRecipient}
                    name="stellar-recipient-type"
                    addressPlaceholder="Enter Stellar address (G...)"
                />
            </div>
            <div className="flex flex-col gap-2 w-full">
                <button
                    className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        isLoading
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-accent text-white hover:bg-accent/80"
                    }`}
                    onClick={handleOnTransfer}
                    disabled={isLoading}
                >
                    {isLoading ? "Transferring..." : "Transfer"}
                </button>
                {txLink != null && !isLoading && (
                    <a
                        href={txLink}
                        data-testid="successful-tx-link"
                        className="text-sm text-gray-500 text-center"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        → View on Stellar Explorer (refresh to update balance)
                    </a>
                )}
            </div>
        </div>
    );
}
