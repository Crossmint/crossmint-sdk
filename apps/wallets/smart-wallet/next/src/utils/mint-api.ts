import { Address, encodeFunctionData } from "viem";

import { EVMSmartWallet } from "@crossmint/client-sdk-react-ui";

import { CollectionABI } from "./collection-abi";

const AMOY_CONTRACT: Address = "0x5c030a01e9d2c4bb78212d06f88b7724b494b755";

export const mintNFT = async (wallet: EVMSmartWallet) => {
    if (!wallet) {
        throw new Error("Wallet is not provided");
    }
    console.log("Minting NFT", wallet.address);

    const data = encodeFunctionData({
        abi: CollectionABI,
        functionName: "mintTo",
        args: [wallet.address],
    });

    const transactionHash = await wallet.client.wallet.sendTransaction({
        to: AMOY_CONTRACT,
        data: data,
    });

    console.log("NFT mint. Tx hash:", transactionHash);
};
