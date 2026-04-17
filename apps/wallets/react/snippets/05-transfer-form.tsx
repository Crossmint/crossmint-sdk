"use client";

import { useWallet } from "@crossmint/client-sdk-react-ui";
import { TransferForm as TransferFormShared } from "@crossmint/wallets-playground-shared";

export function TransferForm() {
    const { wallet } = useWallet();
    return <TransferFormShared wallet={wallet} />;
}
