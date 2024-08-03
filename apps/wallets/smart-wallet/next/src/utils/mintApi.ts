import { encodeFunctionData } from "viem";

import type { EVMSmartWallet } from "@crossmint/client-sdk-smart-wallet";

import { CollectionABI } from "./collectionABI";
import { getNFTContractAddress } from "./getContracts";

export const mintNFT = async (account: EVMSmartWallet) => {
    if (!account) {
        throw new Error("Wallet is not provided");
    }
    console.log("Minting NFT", account.address);
    const contractAddress = getNFTContractAddress(account.chain);

    try {
        const data = encodeFunctionData({
            abi: CollectionABI,
            functionName: "mintTo",
            args: [account.address],
        });

        const transactionHash = await account.client.wallet.sendTransaction({
            to: contractAddress,
            data: data,
        });

        console.log("NFT mint. Tx hash:", transactionHash);
        return true;
    } catch (error) {
        console.error("Error minting NFT:", error);
        return false;
    }
};
