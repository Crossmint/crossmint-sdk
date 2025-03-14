"use client";

import { useState } from "react";
import { useWallet } from "@crossmint/client-sdk-react-ui";
import Image from "next/image";
import Link from "next/link";

import { Fireworks } from "@/components/fireworks";
import { MintNFTButton } from "@/components/mint-nft-button";
import { SecuredByCrossmint } from "@/components/secured-by-crossmint";
import { SignInAuthButton } from "@/components/signin-auth-button";
import { Typography } from "@/components/typography";

function HomePrimaryAction() {
    const { status: walletStatus } = useWallet();
    const [nftSuccessfullyMinted, setNftSuccessfullyMinted] = useState(false);

    if (walletStatus !== "loaded") {
        return <SignInAuthButton />;
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
        return <MintNFTButton setNftSuccessfullyMinted={setNftSuccessfullyMinted} />;
    }
}

export default function Home() {
    return (
        <div className="flex h-full w-full items-center md:p-4 justify-center">
            <div className="flex flex-col pb-12 items-center max-w-[538px] p-4">
                <div className="flex flex-col gap-2 text-center pb-8">
                    <Typography
                        style={{
                            background: "linear-gradient(to right, #602C1B, #FCB69F)",
                            WebkitBackgroundClip: "text",
                            color: "transparent",
                        }}
                        variant={"h1"}
                    >
                        Wallet Demo
                    </Typography>
                    <Typography className="text-primary-foreground text-center">
                        Create a wallet and mint a token, just using Face ID. No passphrase, transaction prompts, or gas
                        fees required
                    </Typography>
                </div>

                <div className="flex flex-col w-full gap-4">
                    <div className="flex w-full gap-4 bg-card rounded-3xl p-6 shadow-dropdown">
                        <div className="w-24 flex items-center justify-center">
                            <Image src="/emoji-nft.png" alt="nft" width={96} height={96} className="rounded-lg" />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                                <h2 className="text-gray-700 font-medium">Wallet Pioneer</h2>
                                <h5 className="text-muted">by Crossmint</h5>
                            </div>
                        </div>
                    </div>
                    <HomePrimaryAction />
                    <SecuredByCrossmint />
                </div>
            </div>
        </div>
    );
}
