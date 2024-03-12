import { getOrCreateWalletEthers, getOrCreateWalletFireblocks } from "@/services/walletService";
import React, { useState } from "react";

import { EVMAAWallet } from "@crossmint/client-sdk-aa";

import styles from "../styles/index.module.css";

interface CreateWalletComponentProps {
    onWalletCreated: (wallet: EVMAAWallet) => void;
}

const CreateWalletComponent: React.FC<CreateWalletComponentProps> = ({ onWalletCreated }) => {
    const [email, setEmail] = useState<string>("");
    const [privateKey, setPrivateKey] = useState<string>("");
    const [walletAddress, setWalletAddress] = useState<string>("");

    const [emailFireblocks, setEmailFireblocks] = useState<string>("");
    const [walletAddressFireblocks, setWalletAddressFireblocks] = useState<string>("");

    const handleCreateWalletEthers = async () => {
        if (!email || !privateKey) {
            console.log("Input 'email' and 'privateKey' values");
            return;
        }
        console.log("Creating wallet");
        const aaWallet = await getOrCreateWalletEthers(email, privateKey);
        console.log({ aaWallet });
        onWalletCreated(aaWallet);
        setWalletAddress(await aaWallet.getAddress());
    };

    const handleCreateWalletFireblocks = async () => {
        if (!emailFireblocks) {
            console.log("Input 'email' value");
            return;
        }
        console.log("Creating wallet");
        const aaWallet = await getOrCreateWalletFireblocks(emailFireblocks);
        console.log({ aaWallet });
        onWalletCreated(aaWallet);
        setWalletAddressFireblocks(await aaWallet.getAddress());
    };

    return (
        <div>
            <div>
                <h3>Ethers Wallet</h3>
                <input
                    type="email"
                    placeholder="Email for ethers"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.input}
                />
                <input
                    type="text"
                    placeholder="Private Key"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    className={styles.input}
                />
                <button onClick={handleCreateWalletEthers} className={styles.button}>
                    Create Wallet for Ethers
                </button>
                <input
                    className={styles.input}
                    type="text"
                    value={walletAddress}
                    data-testid="createdOrGotWalletEthers"
                    readOnly
                />           
            </div>
            <div>
                <h3>Fireblocks Wallet</h3>
                <input
                    type="email"
                    placeholder="Email for fireblocks"
                    value={emailFireblocks}
                    onChange={(e) => setEmailFireblocks(e.target.value)}
                    className={styles.input}
                />
                <button onClick={handleCreateWalletFireblocks} className={styles.button}>
                    Create Fireblocks wallet
                </button>
                <input
                    className={styles.input}
                    type="text"
                    value={walletAddressFireblocks}
                    data-testid="createdOrGotFireblocksWallet"
                    readOnly
                />
            </div>
        </div>
    );
};

export default CreateWalletComponent;
