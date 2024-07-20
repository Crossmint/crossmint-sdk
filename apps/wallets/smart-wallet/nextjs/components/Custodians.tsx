import { setCustodianForKillSwitch, setCustodianForTokens } from "@/services/walletService";
import React from "react";

import { EVMAAWallet } from "@crossmint/client-sdk-aa";

import styles from "../styles/index.module.css";

interface CustodianComponentProps {
    aaWallet: EVMAAWallet | undefined;
}

function CustodianComponent({ aaWallet }: CustodianComponentProps) {
    const handleSetCustodianKillSwitch = async () => {
        if (!aaWallet) {
            console.log("AAWallet not defined");
            return;
        }
        await setCustodianForKillSwitch(aaWallet);
    };

    const handleSetCustodianTokens = async () => {
        if (!aaWallet) {
            console.log("AAWallet not defined");
            return;
        }
        await setCustodianForTokens(aaWallet);
    };

    return (
        <div className={styles.container}>
            <h2>Custodians</h2>
            <button className={styles.button} onClick={handleSetCustodianKillSwitch}>
                Set Custodian for KillSwitch
            </button>
            <button className={styles.button} onClick={handleSetCustodianTokens}>
                Set Custodian for Tokens
            </button>
        </div>
    );
}

export default CustodianComponent;
