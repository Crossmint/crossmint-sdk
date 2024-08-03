import { useToast } from "@/components/use-toast";
import { mintNFT } from "@/utils/mintApi";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { EVMSmartWallet } from "@crossmint/client-sdk-smart-wallet";

import { useAuth } from "./useAuth";

export const useWallet = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { signInAndGetOrCreateWallet } = useAuth();

    const [smartWallet, setSmartWallet] = useState<EVMSmartWallet | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleMint = async () => {
        setIsLoading(true);
        try {
            const wallet = await signInAndGetOrCreateWallet();
            if (!wallet) {
                toast({ title: "Error occurred during wallet creation" });
                return;
            }
            const mintedSuccessfully = await mintNFT(wallet);
            if (mintedSuccessfully) {
                // invalidate the useQuery cache
                await queryClient.invalidateQueries({ queryKey: ["smart-wallet"] });
                toast({ title: "NFT Minted Successfully" });
            }
        } catch (error) {
            console.log({ error });
            toast({ title: "Error occurred during minting" });
        } finally {
            setIsLoading(false);
        }
    };

    return { handleMint, isLoading, smartWallet, setSmartWallet };
};
