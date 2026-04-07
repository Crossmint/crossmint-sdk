"use client";

import { useWallet } from "@crossmint/client-sdk-react-ui";

export function WalletDisplay() {
    const { wallet, status } = useWallet();

    if (status === "in-progress") {
        return <p className="qs-text-muted">Creating wallet...</p>;
    }

    if (!wallet) {
        return <p className="qs-text-muted">No wallet connected</p>;
    }

    return (
        <div className="qs-details">
            <div className="qs-details__row">
                <span className="qs-details__label">Address</span>
                <span className="qs-details__value">{wallet.address}</span>
            </div>
            <div className="qs-details__row">
                <span className="qs-details__label">Owner</span>
                <span className="qs-details__value">{wallet?.owner ?? "—"}</span>
            </div>
            <div className="qs-details__row">
                <span className="qs-details__label">Chain</span>
                <span className="qs-details__value">{wallet.chain}</span>
            </div>
        </div>
    );
}
