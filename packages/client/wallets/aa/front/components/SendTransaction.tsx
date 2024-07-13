import { sendTransaction } from "@/services/walletService";
import React, { useState } from "react";

import { EVMAAWallet } from "@crossmint/client-sdk-aa";

import styles from "../styles/index.module.css";

interface SendTransactionComponentProps {
    aaWallet: EVMAAWallet | undefined;
}

function SendTransactionComponent({ aaWallet }: SendTransactionComponentProps) {
    const [sendTransactionTxHash, setSendTransactionTxHash] = useState("");

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

    return (
        <div className={styles.container}>
            <section className={styles.section}>
                <h2 className={styles.title}>Send Transaction</h2>
                <button className={styles.button} onClick={handleSendTransaction}>
                    Send transaction
                </button>
                <input
                    className={styles.input}
                    type="text"
                    value={sendTransactionTxHash}
                    data-testid="sendTransactionTxHashInput"
                    readOnly
                />
            </section>
        </div>
    );
}

export default SendTransactionComponent;
