"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { WalletBalance } from "../components/balance";
import { Permissions } from "../components/permissions";
import { CrossmintAuthLoginButton } from "../components/login";
import { EVMTransferFunds, SolanaTransferFunds, StellarTransferFunds } from "@/components/transfer";
import { useAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import { CrossmintAuthLogoutButton } from "@/components/logout";
import { ApprovalTest } from "@/components/approval-test";
// import { useEVMPrivyConnector, useSolanaPrivyConnector } from "@/hooks/usePrivyConnector";
// import { useEVMDynamicConnector, useSolanaDynamicConnector } from "@/hooks/useDynamicConnector";

export function HomeContent() {
    // @TODO: Uncomment the connector you want to use

    // const { crossmintWallet: wallet, crossmintWalletStatus: status, isLoading } = useFirebaseConnector();
    // const { crossmintWallet: wallet, crossmintWalletStatus: status, isLoading } = useSolanaPrivyConnector();
    // const {
    //     crossmintWallet: wallet,
    //     crossmintWalletStatus: status,
    //     isLoading,
    // } = useSolanaDynamicConnector();
    // const { crossmintWallet: wallet, crossmintWalletStatus: status, isLoading } = useEVMPrivyConnector();
    // const {
    //     crossmintWallet: wallet,
    //     crossmintWalletStatus: status,
    //     isLoading,
    // } = useEVMDynamicConnector();
    const { wallet, status } = useWallet();
    const { status: crossminAuthStatus } = useAuth();
    const isLoading = status === "in-progress" || crossminAuthStatus === "initializing";

    const walletAddress = wallet?.address;
    const isLoggedIn = wallet != null && status === "loaded";
    const [copiedAddress, setCopiedAddress] = useState(false);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="flex flex-col gap-4 justify-center items-center">
                <Image src="/crossmint.svg" alt="Crossmint logo" priority width={150} height={150} />
                <h1 className="text-xl font-medium">Wallets Quickstart (Devkit)</h1>
                <div className="max-w-md mt-3 w-full min-h-[38px]">
                    {/* @TODO: Uncomment the connector you want to use */}
                    <CrossmintAuthLoginButton />
                    {/* <PrivyLoginButton /> */}
                    {/* <DynamicLabsLoginButton /> */}
                    {/* <FirebaseLoginButton authMethod="google" /> */}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
            <div className="flex flex-col mb-8">
                <Image src="/crossmint.svg" alt="Crossmint logo" priority width={150} height={150} className="mb-4" />
                <h1 className="text-2xl font-semibold mb-2">
                    Wallets Quickstart (Devkit) -{" "}
                    {wallet?.chain === "solana" ? "Solana" : wallet?.chain === "stellar" ? "Stellar" : "EVM"}
                </h1>
                <p className="text-gray-600 text-sm">The easiest way to build onchain</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white flex flex-col gap-3 justify-between rounded-xl border shadow-sm p-5 overflow-hidden">
                    <div className="flex flex-col gap-3">
                        <div>
                            <h2 className="text-lg font-medium">Your wallet</h2>
                            <div className="flex items-center gap-2">
                                <p
                                    className="text-[15px] text-gray-500"
                                    data-testid={`wallet-address:${walletAddress}`}
                                >
                                    {walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : ""}
                                </p>
                                <button
                                    onClick={async () => {
                                        if (!walletAddress) {
                                            return;
                                        }
                                        try {
                                            await navigator.clipboard.writeText(walletAddress);
                                            setCopiedAddress(true);
                                            setTimeout(() => setCopiedAddress(false), 2000);
                                        } catch (err) {
                                            console.error("Failed to copy:", err);
                                        }
                                    }}
                                    className="text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    {copiedAddress ? (
                                        <Image src="/circle-check-big.svg" alt="Copied" width={16} height={16} />
                                    ) : (
                                        <Image src="/copy.svg" alt="Copy" width={16} height={16} />
                                    )}
                                </button>
                            </div>
                        </div>
                        <WalletBalance />
                    </div>
                    {/* @TODO: Uncomment the logout button you want to use */}
                    <CrossmintAuthLogoutButton />
                    {/* <PrivyLogoutButton /> */}
                    {/* <DynamicLabsLogoutButton /> */}
                    {/* <FirebaseLogoutButton /> */}
                </div>
                {wallet?.chain !== "solana" && wallet?.chain !== "stellar" && <EVMTransferFunds />}
                {wallet?.chain === "solana" && <SolanaTransferFunds />}
                {wallet?.chain === "stellar" && <StellarTransferFunds />}
                <Permissions />
                <ApprovalTest />
            </div>
        </div>
    );
}
