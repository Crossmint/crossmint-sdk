"use client";

import { useState } from "react";
import { useWallet } from "@crossmint/client-sdk-react-ui";
import { encodeFunctionData, type Address } from "viem";
import { motion } from "framer-motion";
import { Fingerprint } from "lucide-react";

import { Spinner } from "@/icons/spinner";
import { Typography } from "./typography";
import { useToast } from "./use-toast";
import { CollectionABI } from "@/utils/collection-abi";

const AMOY_CONTRACT: Address = "0x5c030a01e9d2c4bb78212d06f88b7724b494b755";

export const MintNFTButton = ({ setNftSuccessfullyMinted }: { setNftSuccessfullyMinted: (a: boolean) => void }) => {
    const { wallet, type } = useWallet();
    const [isLoadingMint, setIsLoadingMint] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
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

            console.log("Minting NFT", wallet.address);
            switch (type) {
                case "evm-smart-wallet":
                    const evmTxnHash = await wallet.sendTransaction({
                        to: AMOY_CONTRACT,
                        data: encodeFunctionData({
                            abi: CollectionABI,
                            functionName: "mintTo",
                            args: [wallet.address],
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
            setIsHovered(false);
            toast({ title: "Error occurred during minting" });
        } finally {
            setIsLoadingMint(false);
        }
    };

    return (
        <div className="flex justify-center">
            <motion.button
                className="relative flex items-center justify-center gap-2 w-full md:max-w-xs mx-auto py-3 px-6 rounded-full text-[#8B5D3B] font-medium transition-all duration-300"
                style={{
                    background: isHovered ? "linear-gradient(90deg, #E6D2B7, #D9BC94, #E6D2B7)" : "#FFF",
                    border: "1px solid #D9BC94",
                    boxShadow: isHovered
                        ? "0 4px 12px rgba(217, 188, 148, 0.25)"
                        : "0 2px 6px rgba(217, 188, 148, 0.1)",
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                onClick={mint}
                disabled={isLoadingMint}
            >
                {/* Fingerprint icon + animation */}
                <motion.div
                    animate={{
                        rotate: isHovered ? [0, -10, 10, -5, 5, 0] : 0,
                        scale: isHovered ? 1.1 : 1,
                    }}
                    transition={{
                        duration: 0.6,
                        repeat: isHovered ? Infinity : 0,
                        repeatDelay: 0.9,
                        repeatType: "mirror",
                        ease: "easeInOut",
                    }}
                >
                    <Fingerprint
                        size={20}
                        className={`transition-colors duration-300 ${isHovered ? "text-[#6D4427]" : "text-[#8B5D3B]"}`}
                    />
                </motion.div>
                <span className={`transition-colors duration-300 ${isHovered ? "text-[#6D4427]" : "text-[#8B5D3B]"}`}>
                    Mint NFT
                </span>
                {/* Shimmer effect during hover */}
                {isHovered && (
                    <motion.div
                        className="absolute inset-0 rounded-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="absolute inset-0 rounded-full overflow-hidden">
                            <div className="absolute -inset-[100%] bg-[#F5EDE1] opacity-20" />
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
                        </div>
                    </motion.div>
                )}
            </motion.button>
        </div>
    );
};
