"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { type Balances, useWallet } from "@crossmint/client-sdk-react-ui";

export function WalletBalance() {
    const { wallet } = useWallet();
    const [balances, setBalances] = useState<Balances>([]);

    useEffect(() => {
        async function fetchBalances() {
            if (!wallet) {
                return;
            }
            try {
                const balances = await wallet.balances(wallet.chain === "solana" ? ["sol", "usdc"] : ["eth", "usdc"]);
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

    const solBalance = balances?.find((t) => t.token === "sol")?.amount || "0";
    const ethBalance = balances?.find((t) => t.token === "eth")?.amount || "0";
    const usdcBalance = balances?.find((t) => t.token === "usdc")?.amount || "0";

    return (
        <div className="flex flex-col gap-2">
            {wallet?.chain === "solana" ? (
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Image src="/sol.svg" alt="Solana" width={24} height={24} />
                        <p className="font-medium">Solana</p>
                    </div>
                    <div className="text-gray-700 font-medium">{formatBalance(solBalance)} SOL</div>
                </div>
            ) : (
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Image src="/eth.svg" alt="Ethereum" width={24} height={24} />
                        <p className="font-medium">Ethereum</p>
                    </div>
                    <div className="text-gray-700 font-medium">{formatBalance(ethBalance)} ETH</div>
                </div>
            )}
            <div className="border-t my-1"></div>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Image src="/usdc.svg" alt="USDC" width={24} height={24} />
                    <p className="font-medium">USDC</p>
                </div>
                <div className="text-gray-700 font-medium">$ {formatBalance(usdcBalance)}</div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
                {wallet?.chain !== "solana" ? (
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
