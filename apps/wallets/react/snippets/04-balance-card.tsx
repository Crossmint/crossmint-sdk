"use client";

import { useWallet } from "@crossmint/client-sdk-react-ui";
import { BalanceCard as BalanceCardShared } from "@crossmint/wallets-playground-shared";

export function BalanceCard() {
    const { wallet } = useWallet();
    return <BalanceCardShared wallet={wallet} />;
}
