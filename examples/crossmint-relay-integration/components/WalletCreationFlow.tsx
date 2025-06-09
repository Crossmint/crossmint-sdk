"use client";

import React, { useState, useEffect } from "react";
import { useAuth, useWallet } from "@crossmint/client-sdk-react-ui";

interface WalletCreationFlowProps {
    onWalletReady: (address: string) => void;
}

export function WalletCreationFlow({ onWalletReady }: WalletCreationFlowProps) {
    const { status: authStatus, login, logout, user } = useAuth();
    const { status: walletStatus, wallet, getOrCreateWallet } = useWallet();
    const [isCreatingWallet, setIsCreatingWallet] = useState(false);

    useEffect(() => {
        if (authStatus === "authenticated" && walletStatus === "not-loaded") {
            handleCreateWallet();
        }
    }, [authStatus, walletStatus]);

    useEffect(() => {
        if (wallet?.address) {
            onWalletReady(wallet.address);
        }
    }, [wallet?.address, onWalletReady]);

    const handleCreateWallet = async () => {
        if (isCreatingWallet) return;
        
        setIsCreatingWallet(true);
        try {
            await getOrCreateWallet({
                chain: "base-sepolia", // Start with testnet
                signer: { type: "email" }
            });
        } catch (error) {
            console.error("Failed to create wallet:", error);
        } finally {
            setIsCreatingWallet(false);
        }
    };

    const handleLogin = async () => {
        try {
            await login();
        } catch (error) {
            console.error("Login failed:", error);
        }
    };

    if (authStatus === "initializing" || walletStatus === "in-progress" || isCreatingWallet) {
        return (
            <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg shadow-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-gray-600">
                    {authStatus === "initializing" ? "Initializing..." : 
                     walletStatus === "in-progress" || isCreatingWallet ? "Creating your wallet..." : 
                     "Loading..."}
                </p>
            </div>
        );
    }

    if (authStatus === "unauthenticated") {
        return (
            <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-gray-800">Welcome to Crossmint + Relay</h2>
                <p className="text-gray-600 text-center">
                    Create a wallet and bridge assets across chains with just your email.
                    No seed phrases, no gas fee management required.
                </p>
                <button
                    onClick={handleLogin}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Sign In to Get Started
                </button>
            </div>
        );
    }

    if (walletStatus === "loaded" && wallet) {
        return (
            <div className="flex flex-col items-center gap-4 p-6 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <h3 className="text-lg font-semibold text-green-800">Wallet Ready!</h3>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600">Wallet Address:</p>
                    <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                        {wallet.address}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">Chain: {wallet.chain}</p>
                </div>
                <button
                    onClick={logout}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                    Sign Out
                </button>
            </div>
        );
    }

    if (walletStatus === "error") {
        return (
            <div className="flex flex-col items-center gap-4 p-6 bg-red-50 rounded-lg border border-red-200">
                <h3 className="text-lg font-semibold text-red-800">Wallet Creation Failed</h3>
                <p className="text-red-600 text-center">
                    There was an error creating your wallet. Please try again.
                </p>
                <button
                    onClick={handleCreateWallet}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return null;
}
