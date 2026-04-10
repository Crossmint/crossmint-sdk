"use client";

import { useWallet } from "@crossmint/client-sdk-react-ui";
import { Permissions as PermissionsShared } from "@crossmint/wallets-playground-shared";
import { buildExternalWalletSigner } from "../utils/signerCrypto";

export function Permissions() {
    const { wallet, createDeviceSigner, createPasskeySigner } = useWallet();
    return (
        <PermissionsShared
            wallet={wallet}
            createDeviceSigner={createDeviceSigner}
            createPasskeySigner={createPasskeySigner}
            buildExternalWalletSignerFn={buildExternalWalletSigner}
        />
    );
}
