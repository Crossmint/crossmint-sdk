import { encodeFunctionData, type Address } from "viem";

import { CollectionABI } from "./collection-abi";
import type { EVMSmartWallet } from "@crossmint/client-sdk-react-ui";

const AMOY_CONTRACT: Address = "0x5c030a01e9d2c4bb78212d06f88b7724b494b755";

export const mintNFT = async (wallet?: EVMSmartWallet) => {
    if (!wallet) {
        throw new Error("Wallet is not provided");
    }
    console.log("Minting NFT", wallet.getAddress());
    const transactionHash = await wallet.sendTransaction({
        to: AMOY_CONTRACT,
        data: encodeFunctionData({
            abi: CollectionABI,
            functionName: "mintTo",
            args: [wallet.getAddress()],
        }),
    });

    console.log("NFT mint. Tx hash:", transactionHash);
};
