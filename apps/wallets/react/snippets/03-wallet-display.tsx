"use client";

import { useWallet } from "@crossmint/client-sdk-react-ui";

export function WalletDisplay() {
    const { wallet, status } = useWallet();

    if (status === "in-progress") {
        return <p className="xm-text-muted">Fetching wallet...</p>;
    }

    if (wallet == null) {
        return <p className="xm-text-muted">No wallet connected</p>;
    }

    return (
        <div className="xm-details">
            <div className="xm-details__row">
                <span className="xm-details__label">Address</span>
                <span className="xm-details__value">{wallet.address}</span>
            </div>
            <div className="xm-details__row">
                <span className="xm-details__label">Owner</span>
                <span className="xm-details__value">{wallet?.owner ?? "—"}</span>
            </div>
            <div className="xm-details__row">
                <span className="xm-details__label">Chain</span>
                <span className="xm-details__value">{wallet.chain}</span>
            </div>
        </div>
    );
}
