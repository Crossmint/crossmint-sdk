"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useWallet } from "@crossmint/client-sdk-react-ui";
import type { WalletType } from "@/app/context/wallet-config";

interface WalletSelectorProps {
    value: WalletType | "";
    onChange: (value: WalletType) => void;
}

export default function WalletTypeSelector({ value, onChange }: WalletSelectorProps) {
    const { wallet, status } = useWallet();
    const isLoading = status === "in-progress";

    const hintText =
        wallet != null ? `Wallet ${"wallet.type"} connected` : "Select your preferred wallet type to continue";

    const disabled = wallet != null || isLoading;

    return (
        <div className="w-full bg-card rounded-3xl p-6 shadow-light">
            <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-6 h-6 border border-gray-200 rounded-full bg-card text-gray-700 font-medium text-sm">
                    1
                </div>
                <h2 className="text-gray-700 font-medium">Select your preferred wallet type</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    className={cn(
                        `bg-card rounded-xl p-4 flex items-center gap-3 transition-all duration-200 border border-border`,
                        value === "evm-smart-wallet" ? "border-foreground shadow-sm" : "",
                        wallet != null ? "opacity-50 cursor-not-allowed" : ""
                    )}
                    onClick={() => onChange("evm-smart-wallet")}
                    disabled={disabled}
                >
                    <div className="w-6 h-6 flex items-center justify-center">
                        <Image src="/icons/eth.png" alt="Ethereum logo" width={24} height={24} className="rounded-md" />
                    </div>
                    <span className="text-gray-700 font-medium">Ethereum</span>
                </button>

                <button
                    className={cn(
                        `bg-card rounded-xl p-4 flex items-center gap-3 transition-all duration-200 border border-border`,
                        value === "solana-smart-wallet" ? "border-foreground shadow-sm" : "",
                        wallet != null ? "opacity-50 cursor-not-allowed" : ""
                    )}
                    onClick={() => onChange("solana-smart-wallet")}
                    disabled={disabled}
                >
                    <div className="w-6 h-6 flex items-center justify-center ">
                        <Image src="/icons/sol.svg" alt="Solana logo" width={24} height={24} className="rounded-md" />
                    </div>
                    <span className="text-gray-700 font-medium">Solana</span>
                </button>
            </div>

            {hintText != null ? <div className="text-muted text-sm mt-2">{hintText}</div> : null}
        </div>
    );
}
