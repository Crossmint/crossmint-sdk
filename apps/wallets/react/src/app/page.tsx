"use client";

import { useState } from "react";
import { useCrossmintAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import { AuthButton } from "../../snippets/02-auth-button";
import { WalletDisplay } from "../../snippets/03-wallet-display";
import { BalanceCard } from "../../snippets/04-balance-card";
import { TransferForm } from "../../snippets/05-transfer-form";
import { Activity } from "../../snippets/06-activity";
import { Permissions } from "../../snippets/07-permissions";
import { ApprovalTest } from "../../snippets/08-approval-test";
import { ChainTest } from "../../snippets/09-chain-test";

const isJwtMode = process.env.NEXT_PUBLIC_AUTH_MODE === "jwt";

function JwtLogin() {
    const { wallet } = useWallet();
    const [jwt, setJwt] = useState("");
    const [applied, setApplied] = useState(false);

    const applyJwt = () => {
        if (!jwt) return;
        (wallet as any)?.setJwt?.(jwt);
        setApplied(true);
    };

    if (applied) return null;

    return (
        <div className="qs-card qs-card--nested" style={{ maxWidth: 480 }}>
            <p className="qs-label">JWT / BYOA Login</p>
            <input
                className="qs-input qs-mt-sm"
                placeholder="Paste your JWT token"
                value={jwt}
                onChange={(e) => setJwt(e.target.value)}
            />
            <button className="qs-btn qs-btn--primary qs-btn--full qs-mt-md" onClick={applyJwt} disabled={!jwt}>
                Connect with JWT
            </button>
        </div>
    );
}

export default function Home() {
    const { user } = useCrossmintAuth();
    const { wallet, status } = useWallet();

    const isAuthenticated = isJwtMode ? !!wallet : !!user;

    if (!isAuthenticated) {
        return (
            <div className="qs-page">
                <div className="qs-center">
                    <h1 className="qs-title">Wallets Playground</h1>
                    <p className="qs-subtitle qs-mb-lg">Test Crossmint wallet operations</p>
                    {isJwtMode ? <JwtLogin /> : <AuthButton />}
                </div>
            </div>
        );
    }

    return (
        <div className="qs-page">
            <header className="qs-header">
                <span className="qs-header__brand">Wallets Playground</span>
                {!isJwtMode && <AuthButton />}
            </header>

            <main className="qs-container">
                <div className="qs-card">
                    <div className="qs-card__header">
                        <h2 className="qs-card__title">Dashboard</h2>
                    </div>
                    <div className="qs-card__body">
                        {status === "in-progress" && <p className="qs-text-muted">Creating wallet...</p>}
                        {status === "error" && <p className="qs-text-error">Error loading wallet</p>}
                        {status === "loaded" && wallet && (
                            <>
                                <div className="qs-grid qs-grid--2">
                                    <BalanceCard />
                                    <TransferForm />
                                </div>
                                <div className="qs-grid qs-grid--2 qs-mt-md">
                                    <Activity />
                                    <Permissions />
                                </div>
                                <div className="qs-mt-md">
                                    <ApprovalTest />
                                </div>
                                <div className="qs-mt-md">
                                    <ChainTest />
                                </div>
                                <div className="qs-card qs-card--nested qs-mt-md">
                                    <div className="qs-card__body">
                                        <p className="qs-label">Wallet Details</p>
                                        <WalletDisplay />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
