"use client";

import { useState } from "react";
import { useWallet } from "@crossmint/client-sdk-react-ui";
import { encodeFunctionData, type Address } from "viem";

import { Passkey } from "@/icons/passkey";
import { Spinner } from "@/icons/spinner";
import { Typography } from "./typography";
import { useToast } from "./use-toast";
import { Button } from "./button";
import { CollectionABI } from "@/utils/collection-abi";

const AMOY_CONTRACT: Address = "0x5c030a01e9d2c4bb78212d06f88b7724b494b755";

export const MintNFTButton = ({ setNftSuccessfullyMinted }: { setNftSuccessfullyMinted: (a: boolean) => void }) => {
    const { wallet, type } = useWallet();
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

            console.log("Minting NFT", wallet.getAddress());
            switch (type) {
                case "evm-smart-wallet":
                    const evmTxnHash = await wallet.sendTransaction({
                        to: AMOY_CONTRACT,
                        data: encodeFunctionData({
                            abi: CollectionABI,
                            functionName: "mintTo",
                            args: [wallet.getAddress()],
                        }),
                    });
                    console.log("NFT mint. Tx hash:", evmTxnHash);
                    break;
                case "solana-smart-wallet":
                    console.error("TODO: add solana token mint");
                    throw new Error("Solana minting not implemented");
            }
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
