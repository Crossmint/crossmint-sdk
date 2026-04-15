"use client";

import { useWallet } from "@crossmint/client-sdk-react-ui";
import { ActivityList } from "@crossmint/wallets-playground-shared";

export function Activity() {
    const { wallet } = useWallet();
    return <ActivityList wallet={wallet} />;
}
