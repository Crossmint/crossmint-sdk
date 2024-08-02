"use client";

import { Button } from "@/components/button";
import { useWallet } from "@/hooks/useWallet";

export default function Index() {
    const { handleMint, isLoading } = useWallet();

    return (
        <div className="flex h-full w-full items-center pt-24 justify-center">
            <div className="flex flex-col gap-4 items-center">
                <div className="flex p-[1rem] flex-col justify-center items-center gap-[1rem] w-auto md:w-[25rem] mx-auto">
                    <div className="flex p-[1.25rem] flex-col items-center rounded-lg border border-[#E7E9ED] bg-[#FFF]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://bafkreievg3akxgi2arfi6njrmkyy55vga5tfnav5nx2btcew2z7hbgpbyy.ipfs.nftstorage.link"
                            alt="Mint"
                            className="rounded-lg w-[18.75rem] h-[18.75rem]"
                        />
                        <div className="flex flex-col items-start self-stretch mt-[1.25rem]">
                            <p className="text-xl text-[#20343E] font-bold">Crossmint Icecream</p>
                            <p className="text-base text-[#67797F] font-normal">Crossmint</p>
                        </div>

                        <Button
                            disabled={isLoading}
                            onClick={handleMint}
                            className="flex text-[#FFF] mt-[2rem] font-semibold h-[2.625rem] py-0.5 px-1.125 flex-col justify-center items-center gap-0.5 self-stretch rounded-md bg-[#278272] shadow-md"
                        >
                            {isLoading ? "Minting..." : "Mint"}
                        </Button>
                    </div>

                    <div className="flex flex-col justify-center text-center px-[1rem] my-[1rem] font-semibold text-base items-center">
                        <p>Let your users mint NFTs gas-free directly to their new Abstraction Account wallet</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
