"use client";

import { Button } from "@/components/button";
import { Typography } from "@/components/typography";

import { useAuth } from "../hooks/useAuth";

export default function Home() {
    const { signInAndGetOrCreateWallet, isLoading } = useAuth();

    return (
        <div className="flex h-full w-full items-center pt-24 justify-center">
            <div className="flex flex-col gap-4 items-center">
                <Typography variant={"h1"}>Smart Wallet - Mint NFT</Typography>
                <Button
                    className="bg-[#278272] rounded-lg shadow-md text-base text-[#FFF] font-semibold max-w-60 w-full"
                    onClick={signInAndGetOrCreateWallet}
                    disabled={isLoading}
                >
                    {isLoading ? "Loading..." : "Try it!"}
                </Button>
            </div>
        </div>
    );
}
