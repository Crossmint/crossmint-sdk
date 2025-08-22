"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useWallet } from "@crossmint/client-sdk-react-ui";
// @ts-ignore - Type import issue, but balances method exists at runtime
type Balances = {
    nativeToken: { amount: string; symbol: string };
    usdc: { amount: string; symbol: string };
    tokens: Array<{ amount: string; symbol: string }>;
};

export function WalletBalance() {
    const { wallet, type } = useWallet();
    const [balances, setBalances] = useState<Balances | null>(null);

    useEffect(() => {
        async function fetchBalances() {
            if (wallet == null) {
                return;
            }
            try {
                // @ts-ignore - balances method exists at runtime despite TypeScript error
                const balances = await wallet.balances(["usdxm"]);
                setBalances(balances);
            } catch (error) {
                console.error("Error fetching wallet balances:", error);
                alert("Error fetching wallet balances: " + error);
            }
        }
        fetchBalances();
    }, [wallet]);

    const formatBalance = (amount: string) => {
        return parseFloat(amount).toFixed(2);
    };

    return (
        <div className="flex flex-col gap-2">
            {type === "solana-smart-wallet" ? (
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Image src="/sol.svg" alt="Solana" width={24} height={24} />
                        <p className="font-medium">Solana</p>
                    </div>
                    <div className="text-gray-700 font-medium">
                        {formatBalance(balances?.nativeToken.amount ?? "0")} SOL
                    </div>
                </div>
            ) : (
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Image src="/eth.svg" alt="Ethereum" width={24} height={24} />
                        <p className="font-medium">Ethereum</p>
                    </div>
                    <div className="text-gray-700 font-medium">
                        {formatBalance(balances?.nativeToken.amount ?? "0")} ETH
                    </div>
                </div>
            )}

            <div className="border-t my-1"></div>
            {type !== "solana-smart-wallet" ? (
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Image src="/usdc.svg" alt="USDC" width={24} height={24} />
                        <p className="font-medium">USDC</p>
                    </div>
                    <div className="text-gray-700 font-medium" data-testid="usdc-balance">
                        $ {formatBalance(balances?.usdc.amount ?? "0")}
                    </div>
                </div>
            ) : (
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Image src="/usdc.svg" alt="USDC" width={24} height={24} />
                        <p className="font-medium">USDC</p>
                    </div>
                    <div className="text-gray-700 font-medium">
                        $ {formatBalance(balances?.usdc.amount ?? "0")}
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-2 mt-2">
                {type === "solana-smart-wallet" ? (
                    <a
                        href="https://faucet.solana.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 text-sm py-1.5 px-3 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                    >
                        + Get free test SOL
                    </a>
                ) : (
                    <div className="flex items-center justify-center gap-1.5 text-sm py-1.5 px-3 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
                        ETH Faucet coming soon
                    </div>
                )}
                <a
                    href="https://faucet.circle.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-sm py-1.5 px-3 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                >
                    + Get free test USDC
                </a>
            </div>
            <div className="text-gray-500 text-xs">
                Refresh the page after topping up. Balance may take a few seconds to update.
            </div>
        </div>
    );
}
