"use client";

import { Button } from "@/components/button";
import { Typography } from "@/components/typography";

import { useAuth } from "./_lib/use-auth";

export default function Home() {
    const { login, isLoading } = useAuth();

    return (
        <div className="flex h-full w-full items-center pt-24 justify-center">
            <div className="flex flex-col gap-4 items-center">
                <Typography variant={"h1"}>Smart Wallet - Mint NFT</Typography>
                <Button
                    className="bg-[#278272] rounded-lg shadow-md text-base text-[#FFF] font-semibold max-w-60 w-full"
                    onClick={login}
                    disabled={isLoading}
                >
                    {isLoading ? "Loading..." : "Try it!"}
                </Button>
            </div>
        </div>
    );
}
