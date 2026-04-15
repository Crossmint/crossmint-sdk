"use client";

import { useWallet } from "@crossmint/client-sdk-react-ui";
import { ApprovalTest as ApprovalTestShared } from "@crossmint/wallets-playground-shared";

export function ApprovalTest() {
    const { wallet } = useWallet();
    return <ApprovalTestShared wallet={wallet} copyToClipboard={(text) => navigator.clipboard.writeText(text)} />;
}
