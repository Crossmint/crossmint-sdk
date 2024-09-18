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
        return false;
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
        const transactionHash1 = await account.executeContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "mintNFT",
            args: [account.address, "https://ipfs.io/ipfs/bafkreihzaqud4drmkwamevaallgmhjsg7t5oauaqsgpiwor7gvu646znse"],
        });

        const transactionHash = await account.transferToken("0xE898BBd704CCE799e9593a9ADe2c1cA0351Ab660", {
            token: {
                type: "nft",
                tokenId: "446",
                chain: "polygon-amoy",
                contractAddress,
            },
        });

        console.log("NFT transfer. Tx hash:", transactionHash);
        return false;
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

export const CollectionABI = [
    {
        constant: false,
        inputs: [{ indexed: false, internalType: "string", name: "_uri", type: "string" }],
        payable: false,
        stateMutability: "payable",
        type: "constructor",
    },
    {
        constant: false,
        inputs: [{ indexed: false, internalType: "uint256", name: "keyUsed", type: "uint256" }],
        name: "IncorrectKey",
        payable: false,
        type: "error",
    },
    {
        constant: false,
        inputs: [
            { indexed: true, internalType: "address", name: "owner", type: "address" },
            { indexed: true, internalType: "address", name: "spender", type: "address" },
            { indexed: true, internalType: "uint256", name: "id", type: "uint256" },
        ],
        name: "Approval",
        payable: false,
        type: "event",
    },
    {
        constant: false,
        inputs: [
            { indexed: true, internalType: "address", name: "owner", type: "address" },
            { indexed: true, internalType: "address", name: "operator", type: "address" },
            { indexed: false, internalType: "bool", name: "approved", type: "bool" },
        ],
        name: "ApprovalForAll",
        payable: false,
        type: "event",
    },
    {
        constant: false,
        inputs: [
            { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
            { indexed: true, internalType: "address", name: "newOwner", type: "address" },
        ],
        name: "OwnershipTransferred",
        payable: false,
        type: "event",
    },
    {
        constant: false,
        inputs: [
            { indexed: true, internalType: "address", name: "from", type: "address" },
            { indexed: true, internalType: "address", name: "to", type: "address" },
            { indexed: true, internalType: "uint256", name: "id", type: "uint256" },
        ],
        name: "Transfer",
        payable: false,
        type: "event",
    },
    {
        constant: false,
        inputs: [
            { indexed: false, internalType: "address", name: "spender", type: "address" },
            { indexed: false, internalType: "uint256", name: "id", type: "uint256" },
        ],
        name: "approve",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        constant: false,
        inputs: [{ indexed: false, internalType: "address", name: "owner", type: "address" }],
        name: "balanceOf",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: false,
        inputs: [],
        name: "currentTokenId",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: false,
        inputs: [{ indexed: false, internalType: "uint256", name: "", type: "uint256" }],
        name: "getApproved",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: false,
        inputs: [
            { indexed: false, internalType: "address", name: "", type: "address" },
            { indexed: false, internalType: "address", name: "", type: "address" },
        ],
        name: "isApprovedForAll",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: false,
        inputs: [{ indexed: false, internalType: "address", name: "recipient", type: "address" }],
        name: "mintTo",
        outputs: [],
        payable: false,
        stateMutability: "payable",
        type: "function",
    },
    {
        constant: false,
        inputs: [
            { indexed: false, internalType: "address", name: "recipient", type: "address" },
            { indexed: false, internalType: "uint256", name: "key", type: "uint256" },
        ],
        name: "mintToCustomErrorTester",
        outputs: [],
        payable: false,
        stateMutability: "payable",
        type: "function",
    },
    {
        constant: false,
        inputs: [
            { indexed: false, internalType: "address", name: "recipient", type: "address" },
            { indexed: false, internalType: "uint256", name: "key", type: "uint256" },
        ],
        name: "mintToErrorTester",
        outputs: [],
        payable: false,
        stateMutability: "payable",
        type: "function",
    },
    {
        constant: false,
        inputs: [],
        name: "name",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: false,
        inputs: [],
        name: "owner",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: false,
        inputs: [{ indexed: false, internalType: "uint256", name: "id", type: "uint256" }],
        name: "ownerOf",
        outputs: [{ internalType: "address", name: "owner", type: "address" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: false,
        inputs: [],
        name: "renounceOwnership",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        constant: false,
        inputs: [
            { indexed: false, internalType: "address", name: "from", type: "address" },
            { indexed: false, internalType: "address", name: "to", type: "address" },
            { indexed: false, internalType: "uint256", name: "id", type: "uint256" },
        ],
        name: "safeTransferFrom",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        constant: false,
        inputs: [
            { indexed: false, internalType: "address", name: "from", type: "address" },
            { indexed: false, internalType: "address", name: "to", type: "address" },
            { indexed: false, internalType: "uint256", name: "id", type: "uint256" },
            { indexed: false, internalType: "bytes", name: "data", type: "bytes" },
        ],
        name: "safeTransferFrom",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        constant: false,
        inputs: [
            { indexed: false, internalType: "address", name: "operator", type: "address" },
            { indexed: false, internalType: "bool", name: "approved", type: "bool" },
        ],
        name: "setApprovalForAll",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        constant: false,
        inputs: [{ indexed: false, internalType: "string", name: "baseURI", type: "string" }],
        name: "setBaseURI",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        constant: false,
        inputs: [{ indexed: false, internalType: "bytes4", name: "interfaceId", type: "bytes4" }],
        name: "supportsInterface",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: false,
        inputs: [],
        name: "symbol",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: false,
        inputs: [{ indexed: false, internalType: "uint256", name: "tokenId", type: "uint256" }],
        name: "tokenURI",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        constant: false,
        inputs: [
            { indexed: false, internalType: "address", name: "from", type: "address" },
            { indexed: false, internalType: "address", name: "to", type: "address" },
            { indexed: false, internalType: "uint256", name: "id", type: "uint256" },
        ],
        name: "transferFrom",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        constant: false,
        inputs: [{ indexed: false, internalType: "address", name: "newOwner", type: "address" }],
        name: "transferOwnership",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        constant: false,
        inputs: [],
        name: "uri",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
] as const;
