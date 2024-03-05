import type { SignTypedDataParams } from "@alchemy/aa-core";
import { type TransactionRequest } from "@ethersproject/providers";
import { ethers } from "ethers";

import { EVMAAWallet, FireblocksNCWSigner } from "@crossmint/client-sdk-aa";
import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

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

export const signTypedData = async (aaWallet: EVMAAWallet, params: SignTypedDataParams) => {
    const txResponse = await aaWallet.signTypedData(params);
    return txResponse;
};
