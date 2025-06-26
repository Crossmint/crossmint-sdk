"use client";

import Image from "next/image";
import { WalletBalance } from "../components/balance";
import { Permissions } from "../components/permissions";
import { CrossmintAuthLoginButton } from "../components/login";
import { EVMTransferFunds, SolanaTransferFunds } from "@/components/transfer";
import { EVMSignMessage } from "@/components/signMessage";
import { useAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import { CrossmintAuthLogoutButton } from "@/components/logout";
// import { useEVMPrivyConnector, useSolanaPrivyConnector } from "@/hooks/usePrivyConnector";
// import { useEVMDynamicConnector, useSolanaDynamicConnector } from "@/hooks/useDynamicConnector";

export function HomeContent() {
    // @TODO: Uncomment the connector you want to use

    // const { crossmintWallet: wallet, crossmintWalletStatus: status, isLoading } = useSolanaPrivyConnector();
    // const {
    //     crossmintWallet: wallet,
    //     crossmintWalletStatus: status,
    //     isLoading,
    // } = useSolanaDynamicConnector();
    // const {
    //     crossmintWallet: wallet,
    //     crossmintWalletStatus: status,
    //     isLoading,
    // } = useEVMPrivyConnector();
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
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
            <div className="flex flex-col mb-8">
                <Image src="/crossmint.svg" alt="Crossmint logo" priority width={150} height={150} className="mb-4" />
                <h1 className="text-2xl font-semibold mb-2">
                    Wallets Quickstart (Devkit) - {wallet?.chain === "solana" ? "Solana" : "EVM"}
                </h1>
                <p className="text-gray-600 text-sm">The easiest way to build onchain</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white flex flex-col gap-3 justify-between rounded-xl border shadow-sm p-5 overflow-hidden">
                    <div className="flex flex-col gap-3">
                        <div>
                            <h2 className="text-lg font-medium">Your wallet</h2>
                            <div className="flex items-center gap-2">
                                <p className="text-[15px] text-gray-500">
                                    {walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : ""}
                                </p>
                                <button
                                    onClick={() => {
                                        if (walletAddress) {
                                            navigator.clipboard.writeText(walletAddress);
                                            const button = document.activeElement as HTMLButtonElement;
                                            button.disabled = true;
                                            const originalContent = button.innerHTML;
                                            button.innerHTML = `<img src="/check.svg" alt="Check" width="16" height="16" />`;
                                            setTimeout(() => {
                                                button.innerHTML = originalContent;
                                                button.disabled = false;
                                            }, 2000);
                                        }
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <Image src="/copy.svg" alt="Copy" width={16} height={16} />
                                </button>
                            </div>
                        </div>
                        <WalletBalance />
                    </div>
                    {/* @TODO: Uncomment the logout button you want to use */}
                    <CrossmintAuthLogoutButton />
                    {/* <PrivyLogoutButton /> */}
                    {/* <DynamicLabsLogoutButton /> */}
                </div>
                {wallet?.chain !== "solana" && <EVMTransferFunds />}
                {wallet?.chain === "solana" && <SolanaTransferFunds />}
                {wallet?.chain !== "solana" && <EVMSignMessage />}
                <Permissions />
            </div>
        </div>
    );
}
