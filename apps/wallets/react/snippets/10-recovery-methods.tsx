"use client";

import { useWallet } from "@crossmint/client-sdk-react-ui";
import { RecoveryMethods as RecoveryMethodsShared } from "@crossmint/wallets-playground-shared";
import { buildExternalWalletSigner } from "../utils/signerCrypto";

export function RecoveryMethods() {
    const { wallet, createWallet, createPasskeySigner } = useWallet();
    return (
        <RecoveryMethodsShared
            wallet={wallet}
            createWallet={(args) => createWallet(args as Parameters<typeof createWallet>[0])}
            createPasskeySigner={createPasskeySigner}
            buildExternalWalletSignerFn={buildExternalWalletSigner}
        />
    );
}
