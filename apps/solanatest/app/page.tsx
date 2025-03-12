"use client";
import WalletCard from "../components/WalletCard";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-900 to-purple-900 text-white">
            <div className="w-full max-w-9xl flex flex-col md:flex-row gap-8 justify-center">
                <WalletCard title="Solana MPC Wallet" type="mpc" />
                <WalletCard
                    title="Solana Smart Wallet"
                    type="smart"
                    subtitle="Custodial Signer"
                />
                <WalletCard
                    title="Solana Smart Wallet"
                    type="smart-non-custodial"
                    subtitle="Non-Custodial Signer"
                />
            </div>
        </main>
    );
}
