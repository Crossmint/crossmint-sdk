"use client";

import { Fireworks } from "@/components/fireworks";
import { MintNFTButton } from "@/components/mint-nft-button";
import { SecuredByCrossmint } from "@/components/secured-by-crossmint";
import { SignInAuthButton } from "@/components/signin-auth-button";
import { Typography } from "@/components/typography";
import Link from "next/link";
import { useState } from "react";

import { useWallet } from "@crossmint/client-sdk-react-ui";

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

                <div className="flex flex-col w-full md:max-w-[340px] gap-10">
                    <div className="bg-card flex flex-col p-5 rounded-3xl shadow-dropdown">
                        <img className="rounded-xl rounded-bl-none rounded-br-none" src={"/emoji-nft.png"} alt="nft" />
                        <div className="py-4">
                            <Typography className="text-secondary-foreground" variant="h3">
                                Wallet Pioneer
                            </Typography>
                            <Typography className="text-muted-foreground" variant="h5">
                                by Crossmint
                            </Typography>
                        </div>
                    </div>
                    <HomePrimaryAction />

                    <SecuredByCrossmint />
                </div>
            </div>
        </div>
    );
}
