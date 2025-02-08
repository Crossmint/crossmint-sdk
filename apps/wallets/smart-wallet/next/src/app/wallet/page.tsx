"use client";

import { SecuredByCrossmint } from "@/components/secured-by-crossmint";
import { Skeleton } from "@/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { Typography } from "@/components/typography";
import { useQuery } from "@tanstack/react-query";

import { useWallet } from "@crossmint/client-sdk-react-ui";

type NFT = {
    chain: string;
    contractAddress: string;
    tokenId: string;
    metadata: {
        attributes: Array<any>;
        collection: Record<string, any>;
        description: string;
        image: string;
        animation_url: string | null;
        name: string;
    };
    locator: string;
    tokenStandard: string;
};

const SkeletonLoader = () => {
    return (
        <div className="p-6 flex h-full w-full items-center  gap-6 justify-center flex-col">
            <div className="w-full flex-col sm:max-w-[418px] bg-card rounded-2xl shadow-dropdown min-h-[560px] p-6">
                <div className="h-24 rounded-lg border border-border flex flex-col gap-4 items-center justify-center">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex p-8 justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 justify-items-center gap-x-4 gap-y-8 pb-6">
                    <div className="w-full sm:w-auto flex flex-col gap-4">
                        <Skeleton className="w-full h-40 sm:w-40 rounded-[10px]" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="w-full sm:w-auto flex flex-col gap-4">
                        <Skeleton className="w-full h-40 sm:w-40 rounded-[10px]" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="w-full sm:w-auto flex flex-col gap-4">
                        <Skeleton className="w-full h-40 sm:w-40 rounded-[10px]" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="w-full sm:w-auto flex flex-col gap-4">
                        <Skeleton className="w-full h-40 sm:w-40 rounded-[10px]" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                </div>
            </div>
            <SecuredByCrossmint className="pt-6" />
        </div>
    );
};

export default function Index() {
    const { wallet, status: walletStatus } = useWallet();

    const { data, isLoading: isLoadingNFTs } = useQuery({
        queryKey: ["smart-wallet"],
        queryFn: async () => (wallet != null ? await wallet.nfts() : []) as NFT[],
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
        enabled: wallet != null,
    });

    if (walletStatus === "in-progress" || isLoadingNFTs) {
        return <SkeletonLoader />;
    }

    return (
        <div className="p-6 flex h-full w-full items-center pt-6 gap-6 justify-center flex-col">
            <div className="w-full flex-col sm:max-w-[418px] bg-card rounded-2xl shadow-dropdown min-h-[664px] p-6">
                <div className="h-24 rounded-lg border border-border flex flex-col gap-1 items-center justify-center">
                    <Typography className="text-secondary-foreground" variant="h3">
                        Wallet Pioneer
                    </Typography>
                    <Typography className="text-muted" variant="h3">
                        $0.00
                    </Typography>
                </div>
                <Tabs defaultValue="collectibles" className="my-2">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="collectibles">Collectibles</TabsTrigger>
                        <TabsTrigger value="tokens">Tokens</TabsTrigger>
                    </TabsList>
                    <TabsContent value="collectibles" className="h-[420px] overflow-y-auto">
                        {data?.length === 0 ? (
                            <Typography className="text-base text-primary-foreground p-4">
                                {"You have no collectibles."}
                            </Typography>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 justify-items-center gap-x-4 gap-y-8 py-6">
                                {(data || []).map((nft) => (
                                    <div className="flex flex-col gap-4" key={nft.tokenId + nft.contractAddress}>
                                        <img
                                            className="rounded-[10px] max-w-full sm:max-w-[164px]"
                                            src={nft.metadata.image}
                                            alt={nft.metadata.description}
                                        />
                                        <div className="flex flex-col">
                                            <Typography className="text-base text-color-secondary-foreground leading-none">
                                                {nft.metadata.name}
                                            </Typography>
                                            <Typography className="text-sm text-muted">
                                                {nft.metadata.description}
                                            </Typography>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="tokens" className="h-[420px] overflow-y-auto">
                        <Typography className="text-base text-primary-foreground p-4">
                            {"You have no tokens."}
                        </Typography>
                    </TabsContent>
                </Tabs>
            </div>
            <SecuredByCrossmint className="pt-6" />
        </div>
    );
}
