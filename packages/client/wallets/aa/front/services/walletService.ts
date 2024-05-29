import { type TransactionRequest } from "@ethersproject/providers";
import { ethers } from "ethers";
import { SignTypedDataParameters } from "viem";

import { EVMAAWallet, FireblocksNCWSigner } from "@crossmint/client-sdk-aa";
import { EVMBlockchain, EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import ERC20ABI from "../abi/ERC20ABI.json";
import ERC721ABI from "../abi/ERC721ABI.json";
import ERC1155ABI from "../abi/ERC1155ABI.json";

export const getOrCreateWalletEthers = async (email: string, privateKey: string) => {
    const { CrossmintAASDK } = await import("@crossmint/client-sdk-aa");
    const xm = CrossmintAASDK.init({
        apiKey: process.env.NEXT_PUBLIC_API_KEY_STG || "",
    });
    const signer: ethers.Wallet = new ethers.Wallet(privateKey);
    const walletInitParams = {
        signer,
    };
    const userIdentifier = { email };
    return await xm.getOrCreateWallet(userIdentifier, EVMBlockchainIncludingTestnet.POLYGON_MUMBAI, walletInitParams);
};

export const getOrCreateWalletFireblocks = async (email: string) => {
    const { CrossmintAASDK } = await import("@crossmint/client-sdk-aa");
    const xm = CrossmintAASDK.init({
        apiKey: process.env.NEXT_PUBLIC_API_KEY_STG || "",
    });
    const userIdentifier = { email };

    const fireblocksNCWSigner: FireblocksNCWSigner = {
        type: "FIREBLOCKS_NCW",
        passphrase: "1234",
    };

    const walletInitParams = {
        signer: fireblocksNCWSigner,
    };
    return await xm.getOrCreateWallet(userIdentifier, EVMBlockchainIncludingTestnet.POLYGON_MUMBAI, walletInitParams);
};

export const setCustodianForKillSwitch = async (aaWallet: EVMAAWallet) => {
    await aaWallet.setCustodianForKillswitch();
    console.log("Custodian for KS done - Check DB");
};

export const setCustodianForTokens = async (aaWallet: EVMAAWallet) => {
    await aaWallet.setCustodianForTokens();
    console.log("Custodian for Transfer done - Check DB");
};

export const signMessage = async (aaWallet: EVMAAWallet, msg: string) => {
    return await aaWallet.signMessage(msg);
};

export const verifyMessage = async (aaWallet: EVMAAWallet, msg: string, signature: string) => {
    return await aaWallet.verifyMessage(msg, signature);
};

export const sendTransaction = async (aaWallet: EVMAAWallet, tx: TransactionRequest) => {
    const txResponse = await aaWallet.sendTransaction(tx);
    return txResponse.hash;
};

export const signTypedData = async (aaWallet: EVMAAWallet, params: Omit<SignTypedDataParameters, "privateKey">) => {
    const txResponse = await aaWallet.signTypedData(params);
    return txResponse;
};

export const purgeData = async () => {
    try {
        const { CrossmintAASDK } = await import("@crossmint/client-sdk-aa");
        const xm = CrossmintAASDK.init({
            apiKey: process.env.NEXT_PUBLIC_API_KEY_STG || "",
        });
        return xm.purgeAllWalletData();
    } catch (error) {
        console.error(error);
        return false;
    }
};

export const mintAndTransferERC721 = async (aaWallet: EVMAAWallet) => {
    console.log("Minting ERC721");
    const contractAddress = "0x6A1e16403c7de87071703eB21C5FB745ecA0Bf41";
    const contractAbi = ERC721ABI;

    try {
        const contract = new ethers.Contract(contractAddress, contractAbi, aaWallet.provider);
        const signer = aaWallet;
        const contractWithSigner = contract.connect(signer);

        let _tokenId;
        contractWithSigner.on("Transfer", (from, to, tokenId, event) => {
            console.log(`Token ID: ${tokenId.toString()}`);
            _tokenId = tokenId;
        });

        const transaction = await contractWithSigner.mintNFT(
            await aaWallet.getAddress(),
            "https://ipfs.io/ipfs/bafkreihzaqud4drmkwamevaallgmhjsg7t5oauaqsgpiwor7gvu646znse"
        );

        await transaction.wait();

        contractWithSigner.removeAllListeners("Transfer");

        const transactionHash = transaction.hash;
        console.log("ERC721 mint. Tx hash:", transactionHash);

        console.log("Transferring token ", _tokenId);
        const evmToken = {
            chain: EVMBlockchain.POLYGON,
            contractAddress,
            tokenId: _tokenId,
        };

        const hash = await aaWallet.transfer("0x3DdfBa136f0ca9E430ac444Aa426928E5088c03A", evmToken);
        console.log("Token transferred. Tx hash:", hash);
        return hash;
    } catch (error) {
        console.error("Error minting ERC721:", error);
        return "";
    }
};

export const mintAndTransferERC1155 = async (aaWallet: EVMAAWallet) => {
    console.log("Minting ERC1155");
    const contractAddress = "0x06988Fd1C5347fc8EE87f0f999c6e0cD3fFD63fb";
    const contractAbi = ERC1155ABI;

    try {
        const contract = new ethers.Contract(contractAddress, contractAbi, aaWallet.provider);
        const signer = aaWallet;
        const contractWithSigner = contract.connect(signer);

        const tokenId = 1;
        const amount = 1;
        const data = ethers.utils.toUtf8Bytes("");

        const transaction = await contractWithSigner.mint(await aaWallet.getAddress(), tokenId, amount, data);

        await transaction.wait();

        const transactionHash = transaction.hash;
        console.log("ERC1155 mint. Tx hash:", transactionHash);

        console.log("Transferring token ", tokenId);
        const evmToken = {
            chain: EVMBlockchain.POLYGON,
            contractAddress,
            tokenId: tokenId.toString(),
        };

        const hash = await aaWallet.transfer("0x3DdfBa136f0ca9E430ac444Aa426928E5088c03A", evmToken, 1);
        console.log("Token transferred. Tx hash:", hash);
        return hash;
    } catch (error) {
        console.error("Error minting ERC1155:", error);
        return "";
    }
};

export const mintAndTransferERC20 = async (aaWallet: EVMAAWallet) => {
    console.log("Minting ERC20 - 100 USDTest");
    const contractAddress = "0x56a8004DE139C7d8dAA91f985C518E20eD695d24";
    const contractAbi = ERC20ABI;

    try {
        const contract = new ethers.Contract(contractAddress, contractAbi, aaWallet.provider);
        const signer = aaWallet;
        const contractWithSigner = contract.connect(signer);

        const transaction = await contractWithSigner.mint(
            await aaWallet.getAddress(),
            ethers.utils.parseUnits("100", 18)
        );

        await transaction.wait();

        const transactionHash = transaction.hash;
        console.log("ERC20 USDTest minted. TxHash: ", transactionHash);

        console.log("Transferring USDTest");
        const evmToken = {
            chain: EVMBlockchain.POLYGON,
            contractAddress,
            tokenId: "0",
        };

        const hash = await aaWallet.transfer(
            "0x3DdfBa136f0ca9E430ac444Aa426928E5088c03A",
            evmToken,
            undefined,
            ethers.utils.parseUnits("100", 18)
        );

        console.log("USDTest transferred. Tx hash:", hash);
        return hash;
    } catch (error) {
        console.error("Error minting NFT:", error);
        return "";
    }
};
