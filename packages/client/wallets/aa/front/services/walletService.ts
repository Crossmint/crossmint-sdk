import { type TransactionRequest, type TransactionResponse } from "@ethersproject/providers";
import { ethers } from "ethers";

import { EVMAAWallet } from "@crossmint/client-sdk-aa";
import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export const getOrCreateWallet = async (email: string, privateKey: string) => {
    const { CrossmintAASDK } = await import("@crossmint/client-sdk-aa");
    const xm = CrossmintAASDK.init({
        apiKey: process.env.NEXT_PUBLIC_API_KEY_STG || "",
    });
    const signer: ethers.Wallet = new ethers.Wallet(privateKey);
    const walletInitParams = {
        signer,
    };
    const userIdentifier = { email };
    return await xm.getOrCreateWallet(userIdentifier, EVMBlockchainIncludingTestnet.MUMBAI, walletInitParams);
};

export const setCustodianForKillSwitch = async (aaWallet: EVMAAWallet) => {
    await aaWallet.setCustodianForKillswitch();
    console.log("Custodian for KS done - Check DB");
};

export const setCustodianForTokens = async (aaWallet: EVMAAWallet) => {
    await aaWallet.setCustodianForTokens();
    console.log("Custodian for Transfer done - Check DB");
};

export const signMessage = async (aaWallet: EVMAAWallet, msg: string | Uint8Array) => {
    return await aaWallet.signMessage(msg);
};

export const sendTransaction = async (aaWallet: EVMAAWallet, tx: TransactionRequest) => {
    const txResponse = await aaWallet.sendTransaction(tx);
    return txResponse.hash;
};
