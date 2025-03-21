"use client";

import Image from "next/image";
import { Typography } from "@/components/typography";
import { SecuredByCrossmint } from "@/components/secured-by-crossmint";
import { HomePrimaryAction } from "@/components/home-primary-action";

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
