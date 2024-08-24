"use client";

import { Passkey } from "@/icons/passkey";
import { Spinner } from "@/icons/spinner";
import { mintNFT } from "@/utils/mint-api";
import { useState } from "react";

import { useWallet } from "@crossmint/client-sdk-react-ui";

import { Button } from "./button";
import { Typography } from "./typography";
import { useToast } from "./use-toast";

export const MintNFTButton = ({ setNftSuccessfullyMinted }: { setNftSuccessfullyMinted: (a: boolean) => void }) => {
    const { wallet } = useWallet();
    const [isLoadingMint, setIsLoadingMint] = useState(false);
    const { toast } = useToast();

    if (isLoadingMint) {
        return (
            <div className="flex gap-2 items-center self-center min-h-[52px]" role="status">
                <Spinner />
                <Typography className="text-primary-foreground" variant={"h4"}>
                    Minting your NFT...
                </Typography>
            </div>
        );
    }

    const mint = async () => {
        setIsLoadingMint(true);
        try {
            if (!wallet) {
                toast({ title: "Error occurred during wallet creation" });
                return;
            }
            await mintNFT(wallet);
            setNftSuccessfullyMinted(true);
        } catch (error) {
            console.error("Error minting NFT:", error);
            toast({ title: "Error occurred during minting" });
        } finally {
            setIsLoadingMint(false);
        }
    };

    return (
        <Button
            className="bg-background rounded-full text-secondary-foreground font-semibold text-[17px] gap-2 shadow-primary border border-color-secondary-foreground"
            onClick={mint}
            disabled={isLoadingMint}
        >
            <div
                style={{
                    display: "flex",
                    gap: 8,
                    background: "linear-gradient(to right, #602C1B, #eb987d)",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                }}
            >
                <Passkey />
                <Typography className="text-[17px] pt-[0.5px]">Mint NFT</Typography>
            </div>
        </Button>
    );
};
