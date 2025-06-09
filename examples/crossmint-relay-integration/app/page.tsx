"use client";

import React, { useState } from "react";
import { CrossmintRelayProvider } from "../components/CrossmintRelayProvider";
import { WalletCreationFlow } from "../components/WalletCreationFlow";
import { RelayBridgeInterface } from "../components/RelayBridgeInterface";

export default function CrossmintRelayExample() {
    const [walletAddress, setWalletAddress] = useState<string>("");

    const handleWalletReady = (address: string) => {
        setWalletAddress(address);
    };

    return (
        <CrossmintRelayProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_API_KEY || ""}>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
                <div className="container mx-auto px-4">
                    <header className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-gray-800 mb-4">
                            Crossmint + Relay Integration
                        </h1>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Experience seamless wallet creation and instant cross-chain bridging. 
                            Create a smart wallet with just your email and bridge assets across 
                            chains in seconds.
                        </p>
                    </header>

                    <div className="max-w-4xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Wallet Creation Section */}
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                                    Step 1: Create Your Wallet
                                </h2>
                                <WalletCreationFlow onWalletReady={handleWalletReady} />
                            </div>

                            {/* Bridge Interface Section */}
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                                    Step 2: Bridge Assets
                                </h2>
                                {walletAddress ? (
                                    <RelayBridgeInterface walletAddress={walletAddress} />
                                ) : (
                                    <div className="p-6 bg-gray-100 rounded-lg text-center">
                                        <p className="text-gray-600">
                                            Create your wallet first to enable bridging
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Features Section */}
                        <div className="mt-12 grid md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                    Email-Based Wallets
                                </h3>
                                <p className="text-gray-600 text-sm">
                                    Create secure smart wallets using just your email. No seed phrases or complex setup required.
                                </p>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                    Instant Bridging
                                </h3>
                                <p className="text-gray-600 text-sm">
                                    Bridge assets across chains in 1-10 seconds with low fees using Relay's infrastructure.
                                </p>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                    Seamless UX
                                </h3>
                                <p className="text-gray-600 text-sm">
                                    Native app experience without external wallets, gas fee management, or complex flows.
                                </p>
                            </div>
                        </div>

                        {/* Technical Details */}
                        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">
                                Technical Implementation
                            </h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">Crossmint Integration</h4>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                        <li>• Smart wallet creation with email authentication</li>
                                        <li>• Automatic gas fee management</li>
                                        <li>• Multi-chain support (EVM + Solana)</li>
                                        <li>• Non-custodial architecture</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">Relay Integration</h4>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                        <li>• Cross-chain relaying protocol</li>
                                        <li>• 1-10 second transaction times</li>
                                        <li>• Low-cost bridging fees</li>
                                        <li>• Support for major EVM chains</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </CrossmintRelayProvider>
    );
}
