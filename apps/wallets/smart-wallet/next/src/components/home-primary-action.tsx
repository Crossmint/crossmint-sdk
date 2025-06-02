"use client";

import { useState } from "react";
import { useAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import Link from "next/link";
import { Fireworks } from "@/components/fireworks";
import { MintNFTButton } from "@/components/mint-nft-button";
import { SignInAuthButton } from "@/components/signin-auth-button";
import WalletTypeSelector from "@/components/wallet-type-selector";
import { useWalletConfig } from "@/app/context/wallet-config";
import { Typography } from "./typography";
import { Spinner } from "@/icons/spinner";

export function HomePrimaryAction() {
    const { status: authStatus } = useAuth();
    const { status: walletStatus, wallet } = useWallet();
    const [nftSuccessfullyMinted, setNftSuccessfullyMinted] = useState(false);
    const { walletType, setWalletType } = useWalletConfig();

    if (walletStatus === "in-progress" || authStatus === "initializing") {
        return (
            <div className="flex gap-2 items-center self-center min-h-[52px]" role="status">
                <Spinner />
                <Typography className="text-primary-foreground" variant={"h4"}>
                    Waiting for your wallet...
                </Typography>
            </div>
        );
    }

    if (walletStatus !== "loaded") {
        return (
            <div className="flex flex-col gap-4">
                <WalletTypeSelector value={walletType} onChange={setWalletType} />
                <SignInAuthButton />
            </div>
        );
    }

    if (nftSuccessfullyMinted) {
        return (
            <>
                <Fireworks />
                <div className="flex gap-2 items-center self-center min-h-[52px]">
                    <Link
                        href="/wallet"
                        className="underline text-secondary-foreground text-lg font-semibold underline-offset-4"
                    >
                        Open in my wallet
                    </Link>
                </div>
            </>
        );
    } else {
        return wallet?.chain !== "solana" ? (
            <MintNFTButton setNftSuccessfullyMinted={setNftSuccessfullyMinted} />
        ) : null;
    }
}
