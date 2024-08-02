"use client";

import { Skeleton } from "@/components/skeleton";
import { Typography } from "@/components/typography";
import { getAuthedJWT } from "@/lib/firebase";
import { createOrGetPasskeyWallet } from "@/utils/create-or-get-passkey-wallet";
import { useQuery } from "@tanstack/react-query";

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

export default function Index() {
    const { data, isLoading } = useQuery({
        queryKey: ["smart-wallet"],
        queryFn: async () => {
            const authedJWT = await getAuthedJWT();
            const wallet = await createOrGetPasskeyWallet(authedJWT as unknown as string);
            const nfts = await wallet?.nfts();
            return (nfts || []) as NFT[];
        },
    });

    return (
        <div className="flex h-full w-full items-center pt-24 justify-center flex-col">
            <Typography variant="h1" className="p-6">
                Your Smart Wallet
            </Typography>
            <div className="w-full flex-col md:w-5/6 bg-card rounded-lg shadow-lg min-h-[560px]">
                <div className="flex gap-3 p-6 items-center">
                    <Typography variant="h2">Assets</Typography>
                    <Typography variant="h5">
                        {isLoading ? <Skeleton className="w-24 bg-secondary h-8" /> : `${data?.length || 0} assets`}
                    </Typography>
                </div>

                <div className="flex gap-6 p-6 flex-wrap">
                    {isLoading ? (
                        <>
                            <Skeleton className="bg-background flex flex-col gap-4 w-[212px] p-4 border border-primary rounded-2xl">
                                <Skeleton className="rounded-xl bg-card h-48 w-full" />
                                <Skeleton className="h-6 bg-card rounded w-full" />
                                <Skeleton className="h-4 bg-card rounded w-2/3" />
                            </Skeleton>
                            <Skeleton className="bg-background flex flex-col gap-4 w-[212px] p-4 border border-primary rounded-2xl ">
                                <Skeleton className="rounded-xl bg-card h-48 w-full" />
                                <Skeleton className="h-6 bg-card rounded w-full" />
                                <Skeleton className="h-4 bg-card rounded w-2/3" />
                            </Skeleton>
                        </>
                    ) : (
                        (data || []).map((nft) => (
                            <div
                                key={nft.tokenId}
                                className="bg-background flex flex-col gap-4 w-full md:max-w-[212px] p-4 border border-primary rounded-2xl"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img className="rounded-xl" src={nft.metadata.image} alt={nft.metadata.name} />
                                <Typography variant="h3"> {nft.metadata.name}</Typography>
                                <Typography variant="h5">by name here</Typography>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
