import {
    getOrCreateWallet,
    sendTransaction,
    setCustodianForKillSwitch,
    setCustodianForTokens,
    signMessage,
} from "@/services/walletService";
import { useState } from "react";

import { EVMAAWallet } from "@crossmint/client-sdk-aa";

import styles from "../styles/index.module.css";

export default function WalletPage() {
    const [walletAddress, setWalletAddress] = useState("");
    const [signMessageTxHash, setSignMessageTxHash] = useState("");
    const [sendTransactionTxHash, setSendTransactionTxHash] = useState("");
    const [aaWallet, setAAWallet] = useState<EVMAAWallet | undefined>();
    const [email, setEmail] = useState<string>();
    const [privateKey, setPrivateKey] = useState<string>();

    const handleCreateWallet = async () => {
        if (!email || !privateKey) {
            console.log("Input 'email' and 'privateKey' values");
            return;
        }
        console.log("Creating wallet");
        const aaWallet = await getOrCreateWallet(email, privateKey);
        console.log({ aaWallet });
        setAAWallet(aaWallet);
        setWalletAddress(await aaWallet.getAddress());
    };

    const handleSendTransaction = async () => {
        if (aaWallet) {
            const tx = {
                to: "0x3DdfBa136f0ca9E430ac444Aa426928E5088c03A",
                value: "0x00",
            };
            const txHash = await sendTransaction(aaWallet, tx);
            console.log({ sendTransaction_txHash: txHash });
            setSendTransactionTxHash(txHash);
        } else {
            console.log("AAWallet not defined");
        }
    };

    const handleSignMessage = async () => {
        if (aaWallet) {
            const tx = await signMessage(aaWallet, "TEST_MESSAGE");
            console.log({ signMessage_txHash: tx });
            setSignMessageTxHash(tx);
        } else {
            console.log("AAWallet not defined");
        }
    };

    const handleSetCustodianKillSwitch = async () => {
        if (aaWallet) await setCustodianForKillSwitch(aaWallet);
        else console.log("AAWallet not defined");
    };

    const handleSetCustodianTransfer = async () => {
        if (aaWallet) await setCustodianForTokens(aaWallet);
        else console.log("AAWallet not defined");
    };

    return (
        <div className={styles.container}>
            <section className={styles.section}>
                <h2 className={styles.title}>Get / Create</h2>
                <input
                    className={styles.input}
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    className={styles.input}
                    placeholder="Private key"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                />
                <button className={styles.button} onClick={handleCreateWallet}>
                    Create wallet
                </button>
                <input className={styles.input} type="text" value={walletAddress} data-testid="createdOrGotWallet" readOnly />
            </section>

            <section className={styles.section}>
                <h2 className={styles.title}>Custodians</h2>
                <button className={styles.button} onClick={handleSetCustodianKillSwitch}>
                    KillSwitch
                </button>
                <button className={styles.button} onClick={handleSetCustodianTransfer}>
                    Tokens
                </button>
            </section>

            <section className={styles.section}>
                <h2 className={styles.title}>Wallet actions</h2>
                <button className={styles.button} onClick={handleSignMessage}>
                    Sign Message
                </button>
                <input className={styles.input} type="text" value={signMessageTxHash} data-testid="signedMessageInput" readOnly />
                <button className={styles.button} onClick={handleSendTransaction}>
                    Send transaction
                </button>
                <input className={styles.input} type="text" value={sendTransactionTxHash} data-testid="sendTransactionTxHashInput" readOnly />
            </section>
        </div>
    );
}
