import { encodeFunctionData } from "viem";

import type { EVMSmartWallet } from "@crossmint/client-sdk-smart-wallet";

import { CollectionABI } from "./collection-abi";
import { getNFTContractAddress } from "./get-contracts";

export const mintNFT = async (wallet: EVMSmartWallet) => {
    if (!wallet) {
        throw new Error("Wallet is not provided");
    }
    console.log("Minting NFT", wallet.address);
    const contractAddress = getNFTContractAddress(wallet.chain);

    const data = encodeFunctionData({
        abi: CollectionABI,
        functionName: "mintTo",
        args: [wallet.address],
    });

    const transactionHash = await wallet.client.wallet.sendTransaction({
        to: contractAddress,
        data: data,
    });

    console.log("NFT mint. Tx hash:", transactionHash);
};
