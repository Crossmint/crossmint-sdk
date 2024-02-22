import { CrossmintAASDK } from "@crossmint/client-sdk-aa";
import { BlockchainIncludingTestnet } from "@crossmint/common-sdk-base";
import {ethers} from 'ethers'; 

export const createAAWalletHelper = async () => {
    const xm = CrossmintAASDK.init({
      apiKey: process.env.NEXT_PUBLIC_API_KEY || '',
    });
    const signer: ethers.Wallet = ethers.Wallet.createRandom();
    const walletInitParams = {
      signer
    }
    const userIdentifier = { email:"testbegonarandom@test.com" };
    const wallet =  xm.getOrCreateWallet(userIdentifier, BlockchainIncludingTestnet.MUMBAI, walletInitParams);
    console.log(wallet);
    return wallet;
};
