"use client";

import { useState } from "react";
import { useCrossmint, useCrossmintAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import { AuthButton } from "../../snippets/02-auth-button";
import { WalletDisplay } from "../../snippets/03-wallet-display";
import { BalanceCard } from "../../snippets/04-balance-card";
import { TransferForm } from "../../snippets/05-transfer-form";
import { Activity } from "../../snippets/06-activity";
import { Permissions } from "../../snippets/07-permissions";
import { ApprovalTest } from "../../snippets/08-approval-test";
import { ChainTest } from "../../snippets/09-chain-test";

const isJwtMode = process.env.NEXT_PUBLIC_AUTH_MODE === "jwt";

function Dashboard() {
    const { wallet, status } = useWallet();

    return (
        <div className="xm-card__body">
            {status === "in-progress" && <p className="xm-text-muted">Fetching wallet...</p>}
            {status === "error" && <p className="xm-text-error">Error loading wallet</p>}
            {status === "loaded" && wallet && (
                <>
                    <div className="xm-grid xm-grid--2">
                        <BalanceCard />
                        <TransferForm />
                    </div>
                    <div className="xm-grid xm-grid--2 xm-mt-md">
                        <Activity />
                        <Permissions />
                    </div>
                    <div className="xm-mt-md">
                        <ApprovalTest />
                    </div>
                    <div className="xm-mt-md">
                        <ChainTest />
                    </div>
                    <div className="xm-card xm-card--nested xm-mt-md">
                        <div className="xm-card__body">
                            <p className="xm-label">Wallet Details</p>
                            <WalletDisplay />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function JwtLogin() {
    const { setJwt: setCrossmintJwt } = useCrossmint();
    const [jwt, setJwt] = useState("");

    const applyJwt = () => {
        if (jwt == null || jwt === "") return;
        setCrossmintJwt(jwt);
    };

    return (
        <div className="xm-card xm-card--nested" style={{ maxWidth: 480 }}>
            <p className="xm-label">JWT / BYOA Login</p>
            <input
                className="xm-input xm-mt-sm"
                placeholder="Paste your JWT token"
                value={jwt}
                onChange={(e) => setJwt(e.target.value)}
            />
            <button className="xm-btn xm-btn--primary xm-btn--full xm-mt-md" onClick={applyJwt} disabled={!jwt}>
                Connect with JWT
            </button>
        </div>
    );
}

/** JWT mode — useCrossmintAuth is NOT available (no CrossmintAuthProvider in tree) */
function JwtModeHome() {
    const { wallet, status } = useWallet();

    if (wallet == null && status !== "in-progress") {
        return (
            <div className="xm-page">
                <div className="xm-center">
                    <h1 className="xm-title">Wallets Playground</h1>
                    <p className="xm-subtitle xm-mb-lg">Test Crossmint wallet operations</p>
                    <JwtLogin />
                </div>
            </div>
        );
    }

    return (
        <div className="xm-page">
            <header className="xm-header">
                <span className="xm-header__brand">Wallets Playground</span>
            </header>
            <main className="xm-container">
                <div className="xm-card">
                    <div className="xm-card__header">
                        <h2 className="xm-card__title">Dashboard</h2>
                    </div>
                    <Dashboard />
                </div>
            </main>
        </div>
    );
}

/** Standard auth mode — uses CrossmintAuthProvider + useCrossmintAuth */
function AuthModeHome() {
    const { user } = useCrossmintAuth();

    if (user == null) {
        return (
            <div className="xm-page">
                <div className="xm-center">
                    <h1 className="xm-title">Wallets Playground</h1>
                    <p className="xm-subtitle xm-mb-lg">Test Crossmint wallet operations</p>
                    <AuthButton />
                </div>
            </div>
        );
    }

    return (
        <div className="xm-page">
            <header className="xm-header">
                <span className="xm-header__brand">Wallets Playground</span>
                <AuthButton />
            </header>
            <main className="xm-container">
                <div className="xm-card">
                    <div className="xm-card__header">
                        <h2 className="xm-card__title">Dashboard</h2>
                    </div>
                    <Dashboard />
                </div>
            </main>
        </div>
    );
}

export default function Home() {
    return isJwtMode ? <JwtModeHome /> : <AuthModeHome />;
}
