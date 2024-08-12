import { ethers } from "ethers";
import { encodeFunctionData } from "viem";

import type { Chain, EVMSmartWallet } from "@crossmint/client-sdk-smart-wallet";

import contractAbi from "./MintBurnABI.json";
import contractERC20abi from "./erc20tokenSell.json";
import { getERC20ContractAddress, getNFTContractAddress } from "./getContracts";

export const transferTokenERC20 = async (account: EVMSmartWallet, to: string, rawAmount: string) => {
    const contractAddress = getERC20ContractAddress(account.chain);
    try {
        const amountInWei = ethers.utils.parseUnits(rawAmount, 18);

        const data = encodeFunctionData({
            abi: contractERC20abi,
            functionName: "transfer",
            args: [to, amountInWei],
        });

        const transactionHash = await account.client.wallet.sendTransaction({
            to: contractAddress,
            data: data,
        });

        console.log("Token transfer. Tx hash:", transactionHash);
        return true;
    } catch (error) {
        console.error("Error transferring token:", error);
        return false;
    }
};

export const mintNFT = async (account: EVMSmartWallet) => {
    if (!account) {
        throw new Error("Wallet is not provided");
    }
    console.log("Minting NFT", account.address);
    const contractAddress = getNFTContractAddress(account.chain);

    try {
        const data = encodeFunctionData({
            abi: contractAbi,
            functionName: "mintNFT",
            args: [account.address, "https://ipfs.io/ipfs/bafkreihzaqud4drmkwamevaallgmhjsg7t5oauaqsgpiwor7gvu646znse"],
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

export const sellNFT = async (account: EVMSmartWallet, tokenId: number) => {
    console.log("Selling");
    if (!account) {
        throw new Error("Wallet is not provided");
    }
    const contractAddress = getNFTContractAddress(account.chain);

    try {
        const data = encodeFunctionData({
            abi: contractAbi,
            functionName: "sellNFT",
            args: [tokenId],
        });

        const transactionHash = await account.client.wallet.sendTransaction({
            to: contractAddress,
            data: data,
        });

        console.log("NFT sold. Tx hash:", transactionHash);
        return true;
    } catch (error) {
        console.error("Error selling NFT:", error);
        return false;
    }
};

export const walletContent = async (account: EVMSmartWallet, isProd: boolean) => {
    if (!account) {
        throw new Error("Wallet is not provided");
    }

    try {
        return await account.nfts();
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const getTokenBalances = async (address: string, isProd: boolean, chain: Chain) => {
    const baseURL = isProd ? "https://www.crossmint.com" : "https://staging.crossmint.com";
    const apikey = isProd ? process.env.REACT_APP_CROSSMINT_API_KEY_PROD : process.env.REACT_APP_CROSSMINT_API_KEY_STG;

    const fetchURL = `${baseURL}/api/unstable/wallets/${chain}:${address}/tokens`;

    try {
        const response = await fetch(fetchURL, {
            method: "GET",
            headers: {
                accept: "application/json",
                "Content-Type": "application/json",
                "x-api-key": apikey || "",
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! error: ${await response.text()} status: ${response.status}`);
        }
        const resJson = await response.json();
        console.log(JSON.stringify(resJson, null, 2));
        return resJson;
    } catch (error) {
        console.error("Error fetching token balances:", error);
        throw error;
    }
};

export const hexBalanceToDecimalValue = (hexBalance: string) => {
    return ethers.utils.formatEther(hexBalance);
};
