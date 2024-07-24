import CreateWalletComponent from "@/components/CreateWallet";
import CustodianComponent from "@/components/Custodians";
import GetNFTsComponent from "@/components/GetNFTsComponent";
import LocalStorageDataComponent from "@/components/LocalStorage";
import MintAndTransferComponent from "@/components/MintAndTransfer";
import SendTransactionComponent from "@/components/SendTransaction";
import SignComponent from "@/components/SignMessages";
import { useState } from "react";

import { EVMAAWallet } from "@crossmint/client-sdk-aa";

import styles from "../styles/index.module.css";

export default function WalletPage() {
    const [aaWallet, setAAWallet] = useState<EVMAAWallet | undefined>();

    const onCreatedWalled = async (aaWallet: EVMAAWallet) => {
        setAAWallet(aaWallet);
    };

    return (
        <div>
            <div className={styles.container}>
                <section className={styles.section}>
                    <h2 className={styles.title}>Get / Create</h2>
                    <CreateWalletComponent onWalletCreated={onCreatedWalled} />
                </section>
            </div>

            {aaWallet && <CustodianComponent aaWallet={aaWallet} />}

            {aaWallet && <SignComponent aaWallet={aaWallet} />}

            {aaWallet && <SendTransactionComponent aaWallet={aaWallet} />}

            {aaWallet && <MintAndTransferComponent aaWallet={aaWallet} />}

            {aaWallet && <GetNFTsComponent aaWallet={aaWallet} />}

            <LocalStorageDataComponent />
        </div>
    );
}
